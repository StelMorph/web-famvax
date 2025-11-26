// backend/lambda-fns/vaccines/update.ts
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { logAuditEvent } from '../audit/audit';
import { z } from 'zod';

// Schema for updatable fields. All are optional.
const updateVaccineSchema = z.object({
  vaccineName: z.string().min(1).optional(),
  date: z.string().optional().nullable(),
  dose: z.string().optional().nullable(),
  nextDueDate: z.string().optional().nullable(),
  vaccineType: z.string().optional(), // Added missing fields
  lot: z.string().optional().nullable(),
  clinic: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sideEffects: z.string().optional().nullable(),
});

type VaccineUpdateData = z.infer<typeof updateVaccineSchema>;

const updateVaccineLogic: AuthenticatedHandler = async (event) => {
  const { profileId, vaccineId } = event.pathParameters || {};
  const updateData = event.parsedBody as VaccineUpdateData;
  const { userId, email } = event.userContext;

  if (!profileId || !vaccineId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Profile ID and Vaccine ID are required.' }),
    };
  }

  const { Item: originalVaccine } = await docClient.send(
    new GetCommand({
      TableName: process.env.VACCINES_TABLE_NAME!,
      Key: { vaccineId },
    }),
  );

  if (!originalVaccine || originalVaccine.profileId !== profileId) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: 'Vaccine record not found or does not belong to this profile.',
      }),
    };
  }

  const updateExpressionParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = { ':pid': profileId };

  // Add updatedAt timestamp to every update
  updateExpressionParts.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined) {
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
      updateExpressionParts.push(`#${key} = :${key}`);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { statusCode: 200, body: JSON.stringify(originalVaccine) };
  }

  // --- DEFINITIVE FIX: Configure the command to return the newly updated item ---
  const { Attributes: updatedVaccine } = await docClient.send(
    new UpdateCommand({
      TableName: process.env.VACCINES_TABLE_NAME!,
      Key: { vaccineId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ConditionExpression: 'attribute_exists(vaccineId) AND profileId = :pid',
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW', // This is the critical change
    }),
  );

  const changes = Object.entries(updateData)
    .map(([key, newValue]) => {
      const oldValue = originalVaccine[key];
      if (newValue !== oldValue) {
        return {
          field: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
          from: oldValue || 'empty',
          to: newValue || 'empty',
        };
      }
      return null;
    })
    .filter(Boolean);

  if (changes.length > 0) {
    await logAuditEvent({
      userId,
      action: 'UPDATE_VACCINE',
      resource: profileId,
      details: {
        actorEmail: email,
        vaccineId: vaccineId,
        vaccineName: updatedVaccine?.vaccineName || originalVaccine.vaccineName,
        changes: changes,
      },
    });
  }

  // --- DEFINITIVE FIX: Return the full updated vaccine object in the response body ---
  return { statusCode: 200, body: JSON.stringify(updatedVaccine) };
};

export const handler = createHandler({
  schema: updateVaccineSchema,
  handler: updateVaccineLogic,
  access: (event) => ({
    requireDevice: true,
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Editor' },
  }),
});
