// backend/lambda-fns/auth/preAuthentication.ts
import { PreAuthenticationTriggerEvent, PreAuthenticationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const DEVICES_TABLE = process.env.DEVICES_TABLE_NAME!;
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE_NAME!;
const DEVICE_LIMIT_FREE = Number(process.env.DEVICE_LIMIT_FREE || 1);

interface DeviceItem {
  deviceId: string;
  userId: string;
  [k: string]: any;
}

export const handler: PreAuthenticationTriggerHandler = async (
  event: PreAuthenticationTriggerEvent,
) => {
  console.log('--- PRE-AUTH START ---', {
    triggerSource: event.triggerSource,
    userName: event.userName,
  });

  if (event.triggerSource !== 'PreAuthentication_Authentication') {
    console.log('Not password auth. Skipping device checks here.');
    return event;
  }

  const userId = event.userName;
  const meta = event.request.clientMetadata || {};
  const deviceId = meta.deviceId;
  const kickPrevious = String(meta.kickPrevious) === 'true';

  if (!deviceId) {
    console.warn(
      '[preAuth] deviceId missing from ClientMetadata; allowing login (relying on complete-login finisher).',
    );
    return event;
  }

  // =====================================================================================
  // === THE FIX: Use a more robust query and check the status in code ===
  // =====================================================================================
  let isSubscribed = false;
  try {
    // Step 1: Fetch ALL subscription records for the user (will be very few)
    const { Items } = await ddb.send(
      new QueryCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
      }),
    );

    // Step 2: In our code, check if ANY of those records has a status of "active"
    if (Items && Items.length > 0) {
      isSubscribed = Items.some((item) => item.status === 'active');
    }
    console.log(`[preAuth] Subscription check for ${userId}: isSubscribed = ${isSubscribed}`);
  } catch (e) {
    console.warn('Subscription check failed; treating as not subscribed.', e);
  }
  // =====================================================================================
  // === END FIX ===
  // =====================================================================================

  // Query existing devices
  let existing: DeviceItem[] = [];
  try {
    const q = await ddb.send(
      new QueryCommand({
        TableName: DEVICES_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
      }),
    );
    existing = (q.Items || []) as DeviceItem[];
  } catch (e) {
    console.error('Error querying devices:', e);
  }

  const already = existing.some((d) => d.deviceId === deviceId);
  const others = existing.filter((d) => d.deviceId !== deviceId);

  // Enforce limit ONLY IF NOT SUBSCRIBED
  if (!isSubscribed && !already && others.length >= DEVICE_LIMIT_FREE) {
    if (kickPrevious) {
      await Promise.all(
        others.map((d) =>
          ddb.send(new DeleteCommand({ TableName: DEVICES_TABLE, Key: { deviceId: d.deviceId } })),
        ),
      );
    } else {
      console.error(`[preAuth] Device limit exceeded for user ${userId}.`);
      throw new Error('DEVICE_LIMIT_EXCEEDED');
    }
  }

  // Upsert device info
  const now = new Date().toISOString();
  const names: Record<string, string> = { '#ls': 'lastSeen', '#uid': 'userId' };
  const values: Record<string, any> = { ':now': now, ':uid': userId };
  const sets: string[] = ['#ls = :now', '#uid = :uid'];

  const add = (key: string, attr: string) => {
    const v = meta[key];
    if (v !== undefined && v !== null && v !== '') {
      names['#' + attr] = attr;
      values[':' + attr] = v;
      sets.push(`#${attr} = :${attr}`);
    }
  };
  add('deviceType', 'dev_type');
  add('osName', 'dev_osName');
  add('browserName', 'dev_browserName');

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
    console.error('Device upsert failed (non-blocking):', e);
  }

  console.log('--- PRE-AUTH END ---');
  return event;
};
