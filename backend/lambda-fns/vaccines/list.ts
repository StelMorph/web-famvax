// backend/lambda-fns/vaccines/list.ts
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';

const listVaccinesLogic: AuthenticatedHandler = async (event) => {
  const { profileId } = event.pathParameters || {};

  if (!profileId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Profile ID is required.' }) };
  }

  const { Items: vaccines } = await docClient.send(
    new QueryCommand({
      TableName: process.env.VACCINES_TABLE_NAME!,
      IndexName: 'profileId-index',
      KeyConditionExpression: 'profileId = :pid',
      // --- THIS IS THE FIX ---
      // Add a filter expression to exclude records that have the 'deletedAt' attribute.
      FilterExpression: 'attribute_not_exists(deletedAt)',
      ExpressionAttributeValues: { ':pid': profileId },
    }),
  );

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(vaccines || []) };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: listVaccinesLogic,
  access: (event) => ({
    requireDevice: true,
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Viewer' },
  }),
});
