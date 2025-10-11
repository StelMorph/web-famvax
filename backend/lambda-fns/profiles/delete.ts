// backend/lambda-fns/profiles/delete.ts
import { DeleteCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const deleteProfileLogic: AuthenticatedHandler = async (event) => {
  const { profileId } = event.pathParameters || {};
  const { userId } = event.userContext;

  if (!profileId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing profileId' }),
    };
  }

  // --- delete shares (FIX: correct GSI name) ---
  const { Items: sharesToDelete } = await docClient.send(
    new QueryCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      IndexName: 'profileId-inviteeId-index', // <-- was 'profileId-index' (invalid)
      KeyConditionExpression: 'profileId = :profileId',
      ExpressionAttributeValues: { ':profileId': profileId },
    }),
  );
  if (sharesToDelete?.length) {
    const chunks = [];
    for (let i = 0; i < sharesToDelete.length; i += 25) {
      chunks.push(sharesToDelete.slice(i, i + 25));
    }
    for (const chunk of chunks) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [process.env.SHARE_INVITES_TABLE_NAME!]: chunk.map((it) => ({
              DeleteRequest: { Key: { shareId: (it as any).shareId } },
            })),
          },
        }),
      );
    }
  }

  // delete vaccines
  const { Items: vaccinesToDelete } = await docClient.send(
    new QueryCommand({
      TableName: process.env.VACCINES_TABLE_NAME!,
      IndexName: 'profileId-index',
      KeyConditionExpression: 'profileId = :profileId',
      ExpressionAttributeValues: { ':profileId': profileId },
    }),
  );
  if (vaccinesToDelete?.length) {
    const chunks = [];
    for (let i = 0; i < vaccinesToDelete.length; i += 25) {
      chunks.push(vaccinesToDelete.slice(i, i + 25));
    }
    for (const chunk of chunks) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [process.env.VACCINES_TABLE_NAME!]: chunk.map((it) => ({
              DeleteRequest: { Key: { vaccineId: (it as any).vaccineId } },
            })),
          },
        }),
      );
    }
  }

  // delete profile
  await docClient.send(
    new DeleteCommand({ TableName: process.env.PROFILES_TABLE_NAME!, Key: { profileId } }),
  );

  await logAuditEvent({ userId, action: 'DELETE_PROFILE', resourceId: profileId });

  return { statusCode: 204, headers: CORS_HEADERS, body: '' };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: deleteProfileLogic,
  access: (event) => ({
    requireDevice: true,
    enforceDeviceLimit: true,
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Owner' },
  }),
});
