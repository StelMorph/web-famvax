// backend/lambda-fns/devices/list.ts
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';

const listDevicesLogic: AuthenticatedHandler = async (event) => {
  const { userId } = event.userContext;

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: process.env.DEVICES_TABLE_NAME!,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    }),
  );

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Items || []) };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: listDevicesLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
