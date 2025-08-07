import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { docClient, cognitoClient, CORS_HEADERS } from '../common/clients';
import { randomUUID } from 'crypto';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    // --- 1. Extract and Validate Input ---
    const ownerId = event.requestContext.authorizer?.jwt.claims.sub;
    const ownerEmail = event.requestContext.authorizer?.jwt.claims.email;
    const { profileId } = event.pathParameters || {};
    const { inviteeEmail, role } = JSON.parse(event.body || '{}');

    if (!profileId || !ownerId || !ownerEmail) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'User is not authenticated' }),
      };
    }
    if (!inviteeEmail || !role || !['Viewer', 'Editor'].includes(role)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'A valid inviteeEmail and role (Viewer/Editor) are required.',
        }),
      };
    }

    // --- 2. Authorize: Fetch the profile and check for existence and ownership ---
    const profileResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PROFILES_TABLE_NAME!,
        Key: { profileId },
      }),
    );

    // --- THIS IS THE FIX ---
    // First, explicitly check if the profile exists.
    if (!profileResult.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Profile not found.' }),
      };
    }
    // Now that we know .Item exists, we can safely check ownership.
    if (profileResult.Item.userId !== ownerId) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Forbidden: You do not own this profile.',
        }),
      };
    }

    // --- 3. Find the invited user in Cognito to get their permanent ID ---
    const listUsersCmd = new ListUsersCommand({
      UserPoolId: process.env.USER_POOL_ID!,
      Filter: `email = "${inviteeEmail}"`,
      Limit: 1,
    });
    const cognitoResult = await cognitoClient.send(listUsersCmd);
    const invitee = cognitoResult.Users?.[0];

    if (!invitee?.Username) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'Invited user does not exist. Please ask them to sign up first.',
        }),
      };
    }
    const inviteeId = invitee.Username;

    // --- 4. Check for an existing share using the permanent user ID ---
    const existingShareCmd = new QueryCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      IndexName: 'profileId-inviteeId-index',
      KeyConditionExpression: 'profileId = :pid and inviteeId = :iid',
      ExpressionAttributeValues: { ':pid': profileId, ':iid': inviteeId },
    });
    const { Items } = await docClient.send(existingShareCmd);
    const existingShare = Items?.[0];

    // --- 5. Determine whether to UPDATE or CREATE ---
    if (existingShare) {
      // --- UPDATE LOGIC ---
      if (existingShare.role === role) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            message: `An invitation with the '${role}' role has already been sent.`,
          }),
        };
      }
      const updateCmd = new UpdateCommand({
        TableName: process.env.SHARE_INVITES_TABLE_NAME!,
        Key: { shareId: existingShare.shareId },
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
      });
      await docClient.send(updateCmd);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: `Invitation for ${inviteeEmail} updated to ${role}.`,
        }),
      };
    } else {
      // --- CREATE NEW INVITATION LOGIC ---
      const shareId = randomUUID();
      const createCmd = new PutCommand({
        TableName: process.env.SHARE_INVITES_TABLE_NAME!,
        Item: {
          shareId,
          profileId,
          ownerId,
          inviteeId,
          inviteeEmail,
          role,
          status: 'PENDING',
          // This line is now safe because we checked for profileResult.Item above
          profileName: profileResult.Item.name,
          ownerEmail,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      await docClient.send(createCmd);
      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invite sent successfully.' }),
      };
    }
  } catch (error: any) {
    console.error('Error in createOrUpdateShare:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
      }),
    };
  }
};
