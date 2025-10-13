// backend/lambda-fns/common/audit.ts
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../common/clients';
// No longer need randomUUID since we are removing eventId
// import { randomUUID } from 'crypto';

export type AuditAction =
  | 'CREATE_PROFILE'
  | 'UPDATE_PROFILE'
  | 'DELETE_PROFILE'
  | 'CREATE_VACCINE'
  | 'UPDATE_VACCINE'
  | 'DELETE_VACCINE'
  | 'CREATE_SHARE'
  | 'UPDATE_SHARE'
  | 'DELETE_SHARE'
  | 'ACCEPT_SHARE'
  | 'CREATE_SUBSCRIPTION'
  | 'CANCEL_SUBSCRIPTION'
  | 'RESUME_SUBSCRIPTION'
  | 'REVOKE_DEVICE';

interface AuditEventDetails {
  actorEmail?: string;
  profileOwnerId?: string;
  vaccineId?: string;
  vaccineName?: string;
  inviteeEmail?: string;
  changes?: unknown[];
  [key: string]: unknown;
}

interface AuditLoggerInput {
  userId: string;
  action: AuditAction;
  resource: string;
  details?: AuditEventDetails;
}

export async function logAuditEvent(eventDetails: AuditLoggerInput): Promise<void> {
  const { userId, action, resource, details = {} } = eventDetails;

  if (!userId || !resource) {
    console.error(
      'CRITICAL: Failed to log audit event due to missing userId or resource.',
      eventDetails,
    );
    return;
  }

  const timestamp = Date.now();

  const item = {
    userId,
    ts: timestamp,
    action,
    resource,
    details,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: process.env.AUDIT_EVENTS_TABLE_NAME!,
        Item: item,
      }),
    );
  } catch (error) {
    console.error(`Failed to write audit event "${action}" to DynamoDB for user ${userId}:`, error);
  }
}
