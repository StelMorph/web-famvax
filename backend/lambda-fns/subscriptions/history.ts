import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';

const historyLogic: AuthenticatedHandler = async (event) => {
  const { userId } = event.userContext;
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: process.env.SUBSCRIPTIONS_TABLE_NAME!,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false,
    }),
  );
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Items || []) };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: historyLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
