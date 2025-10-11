import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';

async function findLatestActive(userId: string) {
  let ExclusiveStartKey: any | undefined = undefined;
  for (;;) {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: process.env.SUBSCRIPTIONS_TABLE_NAME!,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        // Newest first:
        ScanIndexForward: false,
        ExclusiveStartKey,
        // Pull a reasonable page size:
        Limit: 25,
      }),
    );
    const active = (Items || []).find((it: any) => it.status === 'active');
    if (active) return active;
    if (!LastEvaluatedKey) return null;
    ExclusiveStartKey = LastEvaluatedKey;
  }
}

const getSubscriptionLogic: AuthenticatedHandler = async (event) => {
  const { userId } = event.userContext;

  const active = await findLatestActive(userId);
  if (!active) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'No active subscription found.' }),
    };
  }
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(active) };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: getSubscriptionLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
