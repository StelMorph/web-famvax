// backend/lambda-fns/shares/listByProfile.ts
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';

const listProfileSharesLogic: AuthenticatedHandler = async (event) => {
  const { profileId } = event.pathParameters || {};

  if (!profileId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing profileId' }),
    };
  }

  // Perform the query against the Global Secondary Index (GSI)
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      // FIX: Specify the correct index to query by profileId
      IndexName: 'profileId-inviteeId-index',
      KeyConditionExpression: 'profileId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
    }),
  );

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Items || []) };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: listProfileSharesLogic,
  access: (event) => ({
    requireDevice: true,
    enforceDeviceLimit: true,
    // Ensure the user calling this is the owner of the profile
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Owner' },
  }),
});
