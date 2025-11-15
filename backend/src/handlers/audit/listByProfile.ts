import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';

const listAuditEventsLogic: AuthenticatedHandler = async (event) => {
  const { profileId } = event.pathParameters || {};

  // The 'access' middleware already confirmed the user has the required role ('Owner').
  // Now, we query the GSI to get all events related to this specific profileId.
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: process.env.AUDIT_EVENTS_TABLE_NAME!,

      // --- FINAL, CORRECT QUERY LOGIC ---
      // 1. Use the new, renamed GSI.
      IndexName: 'resource-ts-index',
      // 2. Query using the new attribute name 'resource'. We use a placeholder '#res'
      //    because 'resource' can be a reserved keyword.
      KeyConditionExpression: '#res = :pid',
      ExpressionAttributeNames: {
        '#res': 'resource',
      },
      // 3. The value for the query is the profileId from the URL.
      ExpressionAttributeValues: {
        ':pid': profileId,
      },
      // --- END ---

      ScanIndexForward: false, // Show newest events first
      Limit: 50, // Get the last 50 events for performance
    }),
  );

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Items || []) };
};

export const handler = createHandler({
  // No request body is expected for this GET request.
  schema: z.object({}),
  handler: listAuditEventsLogic,
  access: (event) => ({
    requireDevice: true,
    // CRITICAL: Only the 'Owner' can view the activity log for a profile.
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Owner' },
  }),
});
