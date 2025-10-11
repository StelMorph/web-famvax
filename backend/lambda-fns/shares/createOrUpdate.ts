import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { docClient, cognitoClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const ShareSchema = z.object({
  inviteeEmail: z.string().email(),
  role: z.enum(['Viewer', 'Editor']),
});

const createOrUpdateShareLogic: AuthenticatedHandler = async (event) => {
  const parsedBody = event.parsedBody as z.infer<typeof ShareSchema>;
  const { userId, email: ownerEmail } = event.userContext;
  const { profileId } = event.pathParameters || {};
  const { inviteeEmail, role } = parsedBody;

  if (!profileId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing profileId' }),
    };
  }

  // ... (user and profile lookup logic is unchanged)
  const profileResult = await docClient.send(
    new GetCommand({ TableName: process.env.PROFILES_TABLE_NAME!, Key: { profileId } }),
  );
  if (!profileResult.Item) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Profile not found.' }),
    };
  }

  const listUsersCmd = new ListUsersCommand({
    UserPoolId: process.env.USER_POOL_ID!,
    Filter: `email = "${inviteeEmail}"`,
    Limit: 1,
  });
  const { Users } = await cognitoClient.send(listUsersCmd);
  const invitee = Users?.[0];
  if (!invitee?.Username) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invited user does not exist.' }),
    };
  }
  const inviteeId = invitee.Username;

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      IndexName: 'profileId-inviteeId-index',
      KeyConditionExpression: 'profileId = :pid and inviteeId = :iid',
      ExpressionAttributeValues: { ':pid': profileId, ':iid': inviteeId },
      Limit: 1,
    }),
  );
  const existingShare = Items?.[0];

  if (existingShare) {
    // Logic for UPDATING an existing share
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.SHARE_INVITES_TABLE_NAME!,
        Key: { shareId: (existingShare as any).shareId },
        UpdateExpression: 'set #role = :role, #status = :status, #updatedAt = :ts',
        ExpressionAttributeNames: {
          '#role': 'role',
          '#status': 'status',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':role': role,
          ':status': 'PENDING',
          ':ts': new Date().toISOString(),
        },
      }),
    );

    // --- FIX: Log the UPDATE event against the PROFILE's ID ---
    await logAuditEvent({
      userId,
      action: 'UPDATE_SHARE',
      resource: profileId, // Log against the profile
      details: {
        actorEmail: ownerEmail,
        inviteeEmail: inviteeEmail,
        newRole: role,
      },
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `Invitation for ${inviteeEmail} updated to ${role}.` }),
    };
  }

  // Logic for CREATING a new share
  const shareId = randomUUID();
  await docClient.send(
    new PutCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      Item: {
        shareId,
        profileId,
        ownerId: userId,
        inviteeId,
        inviteeEmail,
        role,
        status: 'PENDING',
        profileName: (profileResult.Item as any).name,
        ownerEmail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
  );

  // --- FIX: Log the CREATE event against the PROFILE's ID ---
  await logAuditEvent({
    userId,
    action: 'CREATE_SHARE',
    resource: profileId, // Log against the profile
    details: {
      actorEmail: ownerEmail,
      inviteeEmail: inviteeEmail,
      role: role,
    },
  });

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({ message: 'Invite sent successfully.' }),
  };
};

export const handler = createHandler({
  schema: ShareSchema,
  handler: createOrUpdateShareLogic,
  access: (event) => ({
    requireDevice: true,
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Owner' },
  }),
});
