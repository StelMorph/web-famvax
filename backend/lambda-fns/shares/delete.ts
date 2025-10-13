import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const deleteShareLogic: AuthenticatedHandler = async (event) => {
  const { shareId } = event.pathParameters || {};
  const { userId, email } = event.userContext;

  if (!shareId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing shareId' }),
    };
  }

  const { Item: share } = await docClient.send(
    new GetCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      Key: { shareId },
    }),
  );

  if (!share) {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const isProfileOwner = share.ownerId === userId;

  await docClient.send(
    new DeleteCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      Key: { shareId },
    }),
  );

  // --- FIX: Log the DELETE event against the PROFILE's ID ---
  if (isProfileOwner) {
    await logAuditEvent({
      userId,
      action: 'DELETE_SHARE',
      resource: share.profileId, // Log against the profile
      details: {
        actorEmail: email,
        inviteeEmail: share.inviteeEmail, // Include who was removed
        profileId: share.profileId,
      },
    });
  }

  return { statusCode: 204, headers: CORS_HEADERS, body: '' };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: deleteShareLogic,
  access: (event) => ({
    requireDevice: true,
    // Access control is handled inside the function
  }),
});
