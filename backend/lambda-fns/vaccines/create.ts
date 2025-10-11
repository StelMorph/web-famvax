// backend/lambda-fns/vaccines/create.ts
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { logAuditEvent } from '../audit/audit';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Define a schema for the incoming vaccine data
const createVaccineSchema = z.object({
  vaccineName: z.string().min(1),
  date: z.string().optional(),
  // Add other vaccine properties here
});

const createVaccineLogic: AuthenticatedHandler = async (event) => {
  const { profileId } = event.pathParameters || {};
  // The parsedBody comes from the middleware after validation
  const vaccineData = event.parsedBody as z.infer<typeof createVaccineSchema>;
  const { userId, email } = event.userContext;

  if (!profileId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Profile ID is required.' }) };
  }

  const vaccineId = randomUUID();
  const newVaccine = {
    vaccineId,
    profileId,
    ...vaccineData,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: process.env.VACCINES_TABLE_NAME!,
      Item: newVaccine,
    }),
  );

  // --- THIS IS THE FIX ---
  // Log the creation event with rich, useful details.
  await logAuditEvent({
    userId: userId,
    action: 'CREATE_VACCINE',
    resource: profileId, // CRITICAL: The resourceId is the profile's ID
    details: {
      actorEmail: email,
      vaccineId: vaccineId, // The ID of the thing that was created
      vaccineName: vaccineData.vaccineName, // The name of the vaccine
    },
  });
  // --- END OF FIX ---

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify(newVaccine),
  };
};

export const handler = createHandler({
  schema: createVaccineSchema,
  handler: createVaccineLogic,
  access: (event) => ({
    requireDevice: true,
    // User must be an 'Editor' to create a vaccine for a profile
    profile: { id: event.pathParameters?.profileId, requiredRole: 'Editor' },
  }),
});
