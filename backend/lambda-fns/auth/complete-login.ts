// backend/lambda-fns/auth/complete-login.ts
import { APIGatewayProxyHandlerV2, APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const DEVICES_TABLE = process.env.DEVICES_TABLE_NAME!;
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE_NAME!;
const DEVICE_LIMIT_FREE = Number(process.env.DEVICE_LIMIT_FREE ?? 1);

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS };
  }

  const authorizedEvent = event as APIGatewayProxyEventV2WithJWTAuthorizer;
  const claims = authorizedEvent.requestContext.authorizer?.jwt?.claims || {};
  const userId: string = (claims.sub as string) || '';
  if (!userId) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ code: 'UNAUTHENTICATED' }) };
  }

  let body: any = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ code: 'BAD_JSON' }) };
  }

  const deviceId: string = String(body.deviceId || '').trim();
  const kickPrevious: boolean = !!body.kickPrevious;
  const meta: Record<string, string> = (body.meta || {}) as Record<string, string>;

  if (!deviceId) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ code: 'DEVICE_ID_REQUIRED' }) };
  }

  // (optional) enforce device limit for free users
  let isSubscribed = false;
  try {
    const { Items } = await ddb.send(
      new QueryCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        KeyConditionExpression: 'userId = :u',
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':u': userId, ':active': 'active' },
        Limit: 1,
      }),
    );
    isSubscribed = !!(Items && Items.length > 0);
  } catch (e) {
    console.warn('[complete-login] Subscription check failed, assuming not subscribed.', e);
  }

  let devices: Array<{ deviceId: string; userId: string }> = [];
  try {
    const q = await ddb.send(
      new QueryCommand({
        TableName: DEVICES_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
      }),
    );
    devices = (q.Items || []) as any[];
  } catch (e) {
    console.error('[complete-login] query devices failed:', e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ code: 'INTERNAL' }) };
  }

  const already = devices.some((d) => d.deviceId === deviceId);
  const others = devices.filter((d) => d.deviceId !== deviceId);

  if (!isSubscribed && !already && others.length >= DEVICE_LIMIT_FREE) {
    if (kickPrevious) {
      try {
        await Promise.all(
          others.map((d) =>
            ddb.send(
              new DeleteCommand({ TableName: DEVICES_TABLE, Key: { deviceId: d.deviceId } }),
            ),
          ),
        );
      } catch (e) {
        console.error('[complete-login] delete others failed:', e);
      }
    } else {
      return {
        statusCode: 403,
        headers: CORS,
        body: JSON.stringify({ code: 'DEVICE_LIMIT_EXCEEDED', message: 'Device limit exceeded' }),
      };
    }
  }

  const now = new Date().toISOString();
  const names: Record<string, string> = { '#ls': 'lastSeen', '#uid': 'userId' };
  const values: Record<string, any> = { ':now': now, ':uid': userId };
  const sets: string[] = ['#ls = :now', '#uid = :uid'];

  // Map meta to stored fields
  const add = (key: string, attr: string) => {
    const v = meta[key];
    if (v) {
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

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: DEVICES_TABLE,
        Key: { deviceId },
        UpdateExpression: 'SET ' + sets.join(', '),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
  } catch (e) {
    console.error('[complete-login] upsert device failed:', e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ code: 'INTERNAL' }) };
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
};
