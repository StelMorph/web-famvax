import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const UpdateStatusSchema = z.object({
  cancelAtPeriodEnd: z.boolean(),
});

async function findLatestActive(userId: string) {
  let ExclusiveStartKey: any | undefined = undefined;
  for (;;) {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: process.env.SUBSCRIPTIONS_TABLE_NAME!,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ScanIndexForward: false,
        ExclusiveStartKey,
        Limit: 25,
      }),
    );
    const active = (Items || []).find((it: any) => it.status === 'active');
    if (active) return active;
    if (!LastEvaluatedKey) return null;
    ExclusiveStartKey = LastEvaluatedKey;
  }
}

const updateStatusLogic: AuthenticatedHandler = async (event) => {
  const parsedBody = event.parsedBody as z.infer<typeof UpdateStatusSchema>;
  const { userId } = event.userContext;
  const { cancelAtPeriodEnd } = parsedBody;

  const activeSubscription = await findLatestActive(userId);
  if (!activeSubscription) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'No active subscription found to modify.' }),
    };
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: process.env.SUBSCRIPTIONS_TABLE_NAME!,
      Key: {
        userId: (activeSubscription as any).userId,
        createdAt: (activeSubscription as any).createdAt,
      },
      UpdateExpression: 'set #cancelAtPeriodEnd = :val, #updatedAt = :ts',
      ExpressionAttributeNames: {
        '#cancelAtPeriodEnd': 'cancelAtPeriodEnd',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: { ':val': cancelAtPeriodEnd, ':ts': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }),
  );

  const action = cancelAtPeriodEnd ? 'CANCEL_SUBSCRIPTION' : 'RESUME_SUBSCRIPTION';
  await logAuditEvent({ userId, action, resource: userId });

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Attributes) };
};

export const handler = createHandler({
  schema: UpdateStatusSchema,
  handler: updateStatusLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
