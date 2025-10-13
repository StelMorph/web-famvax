// backend/lambda-fns/user/overview.ts
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { docClient } from '../common/clients';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

const PROFILES_TABLE = process.env.PROFILES_TABLE_NAME!;
const SHARES_TABLE = process.env.SHARE_INVITES_TABLE_NAME!;
const DEVICES_TABLE = process.env.DEVICES_TABLE_NAME!;

const overviewLogic: AuthenticatedHandler = async (event) => {
  const { userId, email } = event.userContext;

  // Fetch all essential counts in parallel for maximum speed
  const [profilesResult, sharesResult, devicesResult] = await Promise.all([
    // Count user's owned profiles
    docClient.send(
      new QueryCommand({
        TableName: PROFILES_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        Select: 'COUNT',
      }),
    ),
    // Count pending shares for the user
    docClient.send(
      new QueryCommand({
        TableName: SHARES_TABLE,
        IndexName: 'inviteeEmail-index',
        KeyConditionExpression: 'inviteeEmail = :email',
        FilterExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':email': email, ':pending': 'PENDING' },
        Select: 'COUNT',
      }),
    ),
    // Count user's registered devices
    docClient.send(
      new QueryCommand({
        TableName: DEVICES_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        Select: 'COUNT',
      }),
    ),
  ]);

  // Assemble the lean overview payload for the frontend
  const overview = {
    user: {
      email: email,
    },
    subscription: {
      active: event.userContext.subscriptionActive,
    },
    counts: {
      profiles: profilesResult.Count ?? 0,
      pendingShares: sharesResult.Count ?? 0,
      devices: devicesResult.Count ?? 0,
    },
  };

  return {
    statusCode: 200,
    body: JSON.stringify(overview),
  };
};

export const handler = createHandler({
  handler: overviewLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
