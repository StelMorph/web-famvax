import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { logAuditEvent } from '../audit/audit';

const deleteVaccineLogic: AuthenticatedHandler = async (event) => {
  const { profileId, vaccineId } = event.pathParameters || {};
  const { userId, email } = event.userContext;

  if (!profileId || !vaccineId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing profileId or vaccineId' }),
    };
  }

  // STEP 1: Fetch the existing vaccine record BEFORE deleting it.
  // This is the only way to know the name of what is being deleted.
  let vaccineToLog;
  try {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: process.env.VACCINES_TABLE_NAME!,
        Key: { vaccineId },
      }),
    );

    if (!Item || Item.profileId !== profileId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Vaccine record not found or access denied.' }),
      };
    }
    vaccineToLog = Item;
  } catch (err) {
    console.error('Error fetching vaccine before delete:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Could not retrieve vaccine for deletion.' }),
    };
  }

  const now = Date.now();
  const undoToken = randomUUID();
  const undoExpiresAt = now + 10_000;

  try {
    // STEP 2: Perform the "soft delete" by setting the deletedAt timestamp.
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.VACCINES_TABLE_NAME!,
        Key: { vaccineId },
        UpdateExpression: 'SET deletedAt = :ts, undoToken = :tok, undoExpiresAt = :exp',
        ConditionExpression: 'attribute_not_exists(deletedAt)',
        ExpressionAttributeValues: { ':ts': now, ':tok': undoToken, ':exp': undoExpiresAt },
      }),
    );
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ vaccineId, undoToken, undoExpiresAt }),
      };
    }
    console.error('Error soft-deleting vaccine:', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Delete failed.' }) };
  }

  // STEP 3: Log the event with the rich details we fetched in Step 1.
  await logAuditEvent({
    userId,
    action: 'DELETE_VACCINE',
    resource: profileId,
    details: {
      actorEmail: email,
      vaccineId: vaccineId,
      // CRITICAL: Include the name in the log.
      vaccineName: vaccineToLog.vaccineName || 'Unnamed Vaccine',
      profileId: profileId,
    },
  });

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ vaccineId, undoToken, undoExpiresAt }),
  };
};

export const handler = createHandler({
  schema: z.object({}),
  handler: deleteVaccineLogic,
  access: (event) => ({
    requireDevice: true,
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Editor' },
  }),
});
