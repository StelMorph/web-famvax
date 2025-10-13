import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const RestoreSchema = z.object({ undoToken: z.string().min(1) });

const restoreVaccineLogic: AuthenticatedHandler = async (event) => {
  const { profileId, vaccineId } = event.pathParameters || {};
  const { userId } = event.userContext;
  const body = (event.parsedBody || {}) as z.infer<typeof RestoreSchema>;

  if (!profileId || !vaccineId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing profileId or vaccineId' }),
    };
  }

  const now = Date.now();

  await docClient.send(
    new UpdateCommand({
      TableName: process.env.VACCINES_TABLE_NAME!,
      Key: { vaccineId },
      ConditionExpression:
        'attribute_exists(deletedAt) AND attribute_exists(undoToken) AND undoToken = :tok AND undoExpiresAt > :now',
      UpdateExpression: 'REMOVE deletedAt, undoToken, undoExpiresAt',
      ExpressionAttributeValues: { ':tok': body.undoToken, ':now': now },
      ReturnValues: 'NONE',
    }),
  );

  await logAuditEvent({
    userId,
    action: 'UPDATE_VACCINE',
    resource: vaccineId,
    details: { profileId },
  });

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ vaccineId }) };
};

export const handler = createHandler({
  schema: RestoreSchema,
  handler: restoreVaccineLogic,
  access: (event) => ({
    requireDevice: true,
    enforceDeviceLimit: true,
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Editor' },
  }),
});
