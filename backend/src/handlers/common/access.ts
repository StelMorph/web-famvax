// backend/lambda-fns/common/access.ts
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

type Role = 'Viewer' | 'Editor' | 'Owner';
// FIX: Add 'BAD_REQUEST' to the list of valid error codes.
type GuardErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DEVICE_REQUIRED'
  | 'DEVICE_NOT_REGISTERED'
  | 'DEVICE_LIMIT_EXCEEDED'
  | 'BAD_REQUEST';

export class GuardError extends Error {
  status: number;
  code: GuardErrorCode;
  payload?: unknown;
  constructor(status: number, code: GuardErrorCode, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export type AccessOutcome = {
  user: { id: string; email: string };
  subscription: { active: boolean };
  device?: { id: string; registered: boolean; allowed: boolean; limitApplied: boolean };
  profile?: { id: string; authorizedRole?: Role };
};

export type AccessOptions = {
  /** When true, the middleware will *not* run auth/device checks (public endpoint). */
  public?: boolean;

  requireDevice?: boolean;
  enforceDeviceLimit?: boolean;
  deviceLimitFree?: number;
  allowKickPrevious?: boolean; // ignored by strict middleware (kicking only in Pre-Auth)
  profile?: { id?: string; requiredRole?: Role };
};

export type DeviceInfo = {
  deviceId: string;
  deviceType?: string;
  deviceName?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  country?: string;
  city?: string;
  locale?: string;
  timeZone?: string;
};

export class AccessGate {
  private ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  private devicesTable = process.env.DEVICES_TABLE_NAME!;
  private subscriptionsTable = process.env.SUBSCRIPTIONS_TABLE_NAME!;
  private profilesTable = process.env.PROFILES_TABLE_NAME!;
  private sharesTable = process.env.SHARE_INVITES_TABLE_NAME!;

  static fromEnv() {
    return new AccessGate();
  }

  private getHeader(event: APIGatewayProxyEventV2, name: string): string | undefined {
    const headers = event.headers || {};
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : undefined;
  }

  private parseDeviceInfo(event: APIGatewayProxyEventV2): Partial<DeviceInfo> | undefined {
    const raw = this.getHeader(event, 'x-device-info');
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }

  private async checkSubscriptionActive(userId: string): Promise<boolean> {
    const { Items } = await this.ddb.send(
      new QueryCommand({
        TableName: this.subscriptionsTable,
        KeyConditionExpression: 'userId = :u',
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':u': userId, ':active': 'active' },
        Limit: 1,
      }),
    );
    return !!(Items && Items.length > 0);
  }

  /**
   * Strict device enforcement at API:
   * - Never deletes here (kicking is only in Pre-Auth on login).
   * - If device not registered => allowed=false (middleware will 403).
   * - If registered => touch lastSeen and return allowed=true.
   */
  private async ensureDevice(
    userId: string,
    deviceId: string,
    subscribed: boolean,
    _allowKickPrevious: boolean,
    deviceLimitFree: number,
    meta?: Partial<DeviceInfo>,
  ): Promise<{ registered: boolean; allowed: boolean; limitApplied: boolean }> {
    const { Items: existing = [] } = await this.ddb.send(
      new QueryCommand({
        TableName: this.devicesTable,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
      }),
    );

    const registered = existing.some((d: any) => d.deviceId === deviceId);
    const others = existing.filter((d: any) => d.deviceId !== deviceId);

    if (!registered) {
      const limitApplied = others.length >= deviceLimitFree && !subscribed;
      return { registered: false, allowed: false, limitApplied };
    }

    // Update lastSeen & optional meta (non-destructive)
    const now = new Date().toISOString();
    const names: Record<string, string> = { '#ls': 'lastSeen', '#uid': 'userId' };
    const values: Record<string, any> = { ':now': now, ':uid': userId };
    const setParts: string[] = ['#ls = :now', '#uid = if_not_exists(#uid, :uid)'];

    const add = (attr: string, v: any) => {
      if (v !== undefined && v !== null && v !== '') {
        const nk = `#${attr}`;
        const vk = `:${attr}`;
        names[nk] = attr;
        values[vk] = v;
        setParts.push(`${nk} = ${vk}`);
      }
    };

    add('dev_type', meta?.deviceType);
    add('dev_osName', meta?.osName);
    add('dev_osVersion', meta?.osVersion);
    add('dev_browserName', meta?.browserName);
    add('dev_browserVersion', meta?.browserVersion);
    add('dev_locale', meta?.locale);
    add('dev_country', meta?.country);
    add('dev_city', meta?.city);

    try {
      await this.ddb.send(
        new UpdateCommand({
          TableName: this.devicesTable,
          Key: { deviceId },
          UpdateExpression: 'SET ' + setParts.join(', '),
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ConditionExpression: 'attribute_exists(deviceId)',
        }),
      );
    } catch {
      return { registered: false, allowed: false, limitApplied: false };
    }

    return {
      registered: true,
      allowed: true,
      limitApplied: !subscribed && others.length >= deviceLimitFree,
    };
  }

  private async checkProfileRole(
    userId: string,
    userEmail: string,
    profileId: string,
    requiredRole?: Role,
  ): Promise<boolean> {
    if (!requiredRole) return true;

    const { Item: profile } = await this.ddb.send(
      new GetCommand({
        TableName: this.profilesTable,
        Key: { profileId },
      }),
    );
    if (profile && (profile as any).userId === userId) return true;

    const { Items: shares } = await this.ddb.send(
      new QueryCommand({
        TableName: this.sharesTable,
        IndexName: 'profileId-inviteeId-index',
        KeyConditionExpression: 'profileId = :pid',
        FilterExpression: '#status = :acc AND inviteeEmail = :email',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':pid': profileId, ':email': userEmail, ':acc': 'ACCEPTED' },
        Limit: 1,
      }),
    );
    const share = shares?.[0];
    if (!share) return false;

    const role: Role = (share as any).role;
    if (requiredRole === 'Viewer') return role === 'Viewer' || role === 'Editor';
    if (requiredRole === 'Editor') return role === 'Editor';
    return false;
  }

  async enforce(event: APIGatewayProxyEventV2, opts: AccessOptions = {}): Promise<AccessOutcome> {
    // If a caller sets "public", middleware should skip calling enforce().
    // We keep this here for type compatibility only.
    if ((opts as any).public) {
      throw new GuardError(
        500,
        'FORBIDDEN',
        'AccessGate should not be called for public endpoints',
      );
    }

    const options: Required<AccessOptions> = {
      public: false,
      requireDevice: opts.requireDevice ?? true,
      enforceDeviceLimit: opts.enforceDeviceLimit ?? true,
      deviceLimitFree: opts.deviceLimitFree ?? Number(process.env.DEVICE_LIMIT_FREE ?? 1),
      allowKickPrevious: false,
      profile: opts.profile ?? {},
    };

    const claims: any = (event.requestContext as any)?.authorizer?.jwt?.claims ?? {};
    const user = { id: String(claims.sub), email: String(claims.email ?? '') };
    if (!user.id) throw new GuardError(401, 'UNAUTHORIZED', 'Missing user identity');

    const subscriptionActive = await this.checkSubscriptionActive(user.id);

    let deviceSection: AccessOutcome['device'] | undefined;
    if (options.requireDevice || options.enforceDeviceLimit) {
      const deviceId = this.getHeader(event, 'x-device-id');
      if (!deviceId) throw new GuardError(400, 'DEVICE_REQUIRED', 'Device id is required');

      const meta = this.parseDeviceInfo(event);
      const outcome = await this.ensureDevice(
        user.id,
        deviceId,
        subscriptionActive,
        false,
        options.deviceLimitFree,
        meta,
      );

      if (!outcome.registered) {
        if (outcome.limitApplied)
          throw new GuardError(403, 'DEVICE_LIMIT_EXCEEDED', 'Device limit exceeded');
        throw new GuardError(403, 'DEVICE_NOT_REGISTERED', 'Device not registered');
      }
      if (!outcome.allowed) throw new GuardError(403, 'FORBIDDEN', 'Access not allowed');

      deviceSection = {
        id: deviceId,
        registered: outcome.registered,
        allowed: outcome.allowed,
        limitApplied: outcome.limitApplied,
      };
    }

    if (options.profile?.id && options.profile?.requiredRole) {
      const ok = await this.checkProfileRole(
        user.id,
        user.email,
        options.profile.id,
        options.profile.requiredRole,
      );
      if (!ok) throw new GuardError(403, 'FORBIDDEN', 'Insufficient permission for profile.');
    }

    return {
      user,
      subscription: { active: subscriptionActive },
      device: deviceSection,
      profile: options.profile?.id
        ? { id: options.profile.id, authorizedRole: options.profile.requiredRole }
        : undefined,
    };
  }
}
