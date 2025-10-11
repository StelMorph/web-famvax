// backend/lambda-fns/profiles/create.ts
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const CreateProfileSchema = z.object({
  name: z.string().min(1, { message: 'Name cannot be empty' }),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Date of birth must be a valid date string',
  }),
  relationship: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  avatarColor: z.string().optional(),
  nationality: z.string().optional(),
});

const createProfileLogic: AuthenticatedHandler = async (event) => {
  const parsedBody = event.parsedBody as z.infer<typeof CreateProfileSchema>;
  const { userId, subscriptionActive } = event.userContext;
  const PROFILE_LIMIT_FREE = 2;

  if (!subscriptionActive) {
    const { Count: profileCount = 0 } = await docClient.send(
      new QueryCommand({
        TableName: process.env.PROFILES_TABLE_NAME!,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        Select: 'COUNT',
      }),
    );
    if (profileCount >= PROFILE_LIMIT_FREE) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'PROFILE_LIMIT_REACHED',
          detail: `Free accounts are limited to ${PROFILE_LIMIT_FREE} profiles.`,
        }),
      };
    }
  }

  const profileId = randomUUID();
  const item = { userId, profileId, ...parsedBody };

  await docClient.send(
    new PutCommand({
      TableName: process.env.PROFILES_TABLE_NAME!,
      Item: item,
    }),
  );

  await logAuditEvent({
    userId,
    action: 'CREATE_PROFILE',
    resourceId: profileId,
    details: { name: item.name },
  });

  return { statusCode: 201, headers: CORS_HEADERS, body: JSON.stringify(item) };
};

export const handler = createHandler({
  schema: CreateProfileSchema,
  handler: createProfileLogic,
  access: { requireDevice: true, enforceDeviceLimit: true }, // one-call OOP gate
});
