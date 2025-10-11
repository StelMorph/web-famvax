// backend/lambda-fns/devices/revoke.ts
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminUserGlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const cidp = new CognitoIdentityProviderClient({});

const revokeDeviceLogic: AuthenticatedHandler = async (event) => {
  const { userId } = event.userContext;
  const { deviceId } = event.pathParameters || {};
  const scope = (event.queryStringParameters?.scope || 'single').toLowerCase();

  if (!deviceId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'deviceId is required in path.' }),
    };
  }

  const { Item: device } = await docClient.send(
    new GetCommand({ TableName: process.env.DEVICES_TABLE_NAME!, Key: { deviceId } }),
  );

  if (!device || (device as any).userId !== userId) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Forbidden: not your device.' }),
    };
  }

  if (scope === 'global') {
    await cidp.send(
      new AdminUserGlobalSignOutCommand({
        UserPoolId: process.env.USER_POOL_ID!,
        Username: userId,
      }),
    );
  }

  await docClient.send(
    new DeleteCommand({ TableName: process.env.DEVICES_TABLE_NAME!, Key: { deviceId } }),
  );
  await logAuditEvent({ userId, action: 'REVOKE_DEVICE', resourceId: deviceId });

  return { statusCode: 204, headers: CORS_HEADERS, body: '' };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: revokeDeviceLogic,
  access: { requireDevice: true, enforceDeviceLimit: true },
});
