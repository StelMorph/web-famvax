// backend/lambda-fns/profiles/get.ts
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
// import { logAuditEvent } from '../common/audit'; // No longer needed here
import { z } from 'zod';

const getProfileLogic: AuthenticatedHandler = async (event) => {
  const { profileId } = event.pathParameters || {};

  if (!profileId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Profile ID is required.' }) };
  }

  const { Item: profile } = await docClient.send(
    new GetCommand({
      TableName: process.env.PROFILES_TABLE_NAME!,
      Key: { profileId },
    }),
  );

  if (!profile) {
    return { statusCode: 404, body: JSON.stringify({ message: 'Profile not found.' }) };
  }

  /*
  // REMOVED: Per your request, we are no longer logging simple view actions.
  await logAuditEvent({
    userId: event.userContext.userId,
    action: 'VIEW_PROFILE',
    resource: profileId,
    details: { actorEmail: event.userContext.email, profileOwnerId: profile.userId }
  });
  */

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(profile) };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: getProfileLogic,
  access: (event) => ({
    requireDevice: true,
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Viewer' },
  }),
});
