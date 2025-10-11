// backend/lambda-fns/profiles/update.ts
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, type AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const ALLOWED_KEYS = [
  'name',
  'dob',
  'relationship',
  'gender',
  'bloodType',
  'allergies',
  'medicalConditions',
  'avatarColor',
] as const;

const UpdateProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    dob: z.string().optional(),
    relationship: z.string().optional(),
    gender: z.string().optional(),
    bloodType: z.string().optional(),
    allergies: z.string().optional(),
    medicalConditions: z.string().optional(),
    avatarColor: z.string().optional(),
  })
  // allow extra keys in the payload but we will strip them ourselves
  .passthrough();

const updateProfileLogic: AuthenticatedHandler = async (event) => {
  const body = (event.parsedBody || {}) as z.infer<typeof UpdateProfileSchema>;
  const { profileId } = event.pathParameters || {};
  const { userId } = event.userContext;

  if (!profileId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing profileId' }),
    };
  }

  // Keep only allowed keys and drop undefined/empty strings
  const cleaned = Object.fromEntries(
    Object.entries(body).filter(
      ([k, v]) => (ALLOWED_KEYS as readonly string[]).includes(k) && v !== undefined && v !== '',
    ),
  );
  const entries = Object.entries(cleaned);
  if (!entries.length) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'No fields to update' }),
    };
  }

  const EAN: Record<string, string> = {};
  const EAV: Record<string, unknown> = {};
  const set: string[] = [];
  for (const [k, v] of entries) {
    const nk = `#${k}`;
    const vk = `:${k}`;
    EAN[nk] = k;
    EAV[vk] = v;
    set.push(`${nk} = ${vk}`);
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: process.env.PROFILES_TABLE_NAME!,
      Key: { profileId },
      UpdateExpression: `SET ${set.join(', ')}`,
      ExpressionAttributeNames: EAN,
      ExpressionAttributeValues: EAV,
      ReturnValues: 'ALL_NEW',
    }),
  );

  await logAuditEvent({ userId, action: 'UPDATE_PROFILE', resourceId: profileId });
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Attributes) };
};

export const handler = createHandler({
  schema: UpdateProfileSchema,
  handler: updateProfileLogic,
  access: (event) => ({
    requireDevice: true,
    enforceDeviceLimit: true,
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Editor' },
  }),
});
