// backend/lambda-fns/subscriptions/create.ts
import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { PutCommand, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { logAuditEvent } from '../audit/audit';

const IDEM_TABLE = process.env.IDEMPOTENCY_TABLE_NAME!;
const SUBS_TABLE = process.env.SUBSCRIPTIONS_TABLE_NAME!;

const BodySchema = z.object({
  plan: z.enum(['premium', 'monthly', 'yearly']).default('premium'),
  trial: z.boolean().optional().default(false),
});

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

const handlerLogic: AuthenticatedHandler = async (event) => {
  const { userId } = event.userContext;
  const body = event.parsedBody as z.infer<typeof BodySchema>;
  const idemKey = event.headers?.['x-idempotency-key'] as string | undefined;

  if (!idemKey) return json(400, { message: 'X-Idempotency-Key header is required' });

  const idemId = `${userId}#${idemKey}`;
  const ttl = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes

  try {
    await docClient.send(
      new PutCommand({
        TableName: IDEM_TABLE,
        Item: { id: idemId, resultUserId: null, resultCreatedAt: null, expiration: ttl },
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    );
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      const idem = await docClient.send(
        new GetCommand({ TableName: IDEM_TABLE, Key: { id: idemId } }),
      );
      const u = idem.Item?.resultUserId as string;
      const ca = idem.Item?.resultCreatedAt as string;
      if (u && ca) {
        const orig = await docClient.send(
          new GetCommand({ TableName: SUBS_TABLE, Key: { userId: u, createdAt: ca } }),
        );
        if (orig.Item) return json(200, orig.Item);
      }
      return json(409, { message: 'Duplicate request in progress' });
    }
    throw err;
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const end = new Date(now);
  if (body.trial) end.setDate(end.getDate() + 7);
  const endDate = end.toISOString();

  // --- THE FIX: Deactivate previous subscription by setting its `status` to 'inactive' ---
  const { Items: prevItems } = await docClient.send(
    new QueryCommand({
      TableName: SUBS_TABLE,
      KeyConditionExpression: 'userId = :u',
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':u': userId, ':active': 'active' },
      Limit: 1,
    }),
  );
  const previousActiveSub = prevItems?.[0];

  if (previousActiveSub) {
    await docClient.send(
      new UpdateCommand({
        TableName: SUBS_TABLE,
        Key: { userId: previousActiveSub.userId, createdAt: previousActiveSub.createdAt },
        UpdateExpression: 'SET #status = :inactive, #updatedAt = :ts',
        ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: { ':inactive': 'inactive', ':ts': now.toISOString() },
      }),
    );
  }
  // --- END FIX ---

  // Create the new subscription record, now without the redundant `active` boolean
  const sub = {
    userId,
    createdAt,
    plan: body.plan,
    trial: !!body.trial,
    status: 'active', // This is now the single source of truth
    cancelAtPeriodEnd: false,
    endDate,
    updatedAt: now.toISOString(),
  };

  await docClient.send(new PutCommand({ TableName: SUBS_TABLE, Item: sub }));
  await logAuditEvent({
    userId,
    action: 'CREATE_SUBSCRIPTION',
    resource: userId,
    details: { plan: sub.plan },
  });

  await docClient.send(
    new UpdateCommand({
      TableName: IDEM_TABLE,
      Key: { id: idemId },
      UpdateExpression: 'SET resultUserId = :u, resultCreatedAt = :ca',
      ExpressionAttributeValues: { ':u': userId, ':ca': createdAt },
    }),
  );

  return json(201, sub);
};

export const handler = createHandler({
  schema: BodySchema,
  handler: handlerLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
