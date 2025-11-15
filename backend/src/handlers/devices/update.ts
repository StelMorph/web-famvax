// backend/lambda-fns/devices/update.ts
import { APIGatewayProxyResultV2, APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';

const DEVICES_TABLE = process.env.DEVICES_TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  const claims = event.requestContext.authorizer?.jwt?.claims ?? {};
  const userId = String((claims as any).sub ?? (claims as any)['cognito:username'] ?? '');
  if (!userId) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ code: 'UNAUTHORIZED' }),
    };
  }

  const headerDeviceId =
    event.headers?.['x-device-id'] ||
    event.headers?.['X-Device-Id'] ||
    event.headers?.['X-Device-ID'];

  let body: any = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ code: 'BAD_JSON' }) };
  }

  const deviceId = String(body.deviceId ?? '');
  if (!headerDeviceId || !deviceId || headerDeviceId !== deviceId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        code: 'DEVICE_ID_MISMATCH',
        message: 'x-device-id must match body.deviceId',
      }),
    };
  }

  const existing = await docClient.send(
    new GetCommand({ TableName: DEVICES_TABLE, Key: { deviceId } }),
  );
  if (!existing.Item || (existing.Item as any).userId !== userId) {
    return {
      statusCode: 409,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        code: 'UPDATE_REQUIRES_EXISTING_DEVICE',
        message: 'Device not found for this user.',
      }),
    };
  }

  const now = new Date().toISOString();
  const names: Record<string, string> = { '#ls': 'lastSeen' };
  const values: Record<string, any> = { ':now': now };
  const sets: string[] = ['#ls = :now'];

  const add = (key: string, attr: string) => {
    const v = body[key];
    if (v !== undefined) {
      names['#' + attr] = attr;
      values[':' + attr] = v;
      sets.push(`#${attr} = :${attr}`);
    }
  };

  add('deviceType', 'dev_type');
  add('osName', 'dev_osName');
  add('browserName', 'dev_browserName');
  add('locale', 'dev_locale');
  add('timeZone', 'dev_timeZone');

  await docClient.send(
    new UpdateCommand({
      TableName: DEVICES_TABLE,
      Key: { deviceId },
      UpdateExpression: 'SET ' + sets.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
};
