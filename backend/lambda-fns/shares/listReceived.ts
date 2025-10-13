import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';

const listReceivedLogic: AuthenticatedHandler = async (event) => {
  const { email } = event.userContext;

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      IndexName: 'inviteeEmail-index',
      KeyConditionExpression: 'inviteeEmail = :inviteeEmail',
      ExpressionAttributeValues: { ':inviteeEmail': email },
    }),
  );
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Items || []) };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: listReceivedLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
