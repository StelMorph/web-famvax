import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

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

const cancelLogic: AuthenticatedHandler = async (event) => {
  const { userId } = event.userContext;

  const activeSubscription = await findLatestActive(userId);
  if (!activeSubscription) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'No active subscription found to cancel.' }),
    };
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: process.env.SUBSCRIPTIONS_TABLE_NAME!,
      Key: {
        userId: (activeSubscription as any).userId,
        createdAt: (activeSubscription as any).createdAt,
      },
      UpdateExpression: 'set #status = :canceled_status, #canceledAt = :ts, #updatedAt = :ts',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#canceledAt': 'canceledAt',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':canceled_status': 'canceled',
        ':ts': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }),
  );

  await logAuditEvent({ userId, action: 'CANCEL_SUBSCRIPTION', resourceId: userId });

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Attributes) };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: cancelLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
