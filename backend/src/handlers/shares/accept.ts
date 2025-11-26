// backend/lambda-fns/shares/accept.ts
import { UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { createHandler, AuthenticatedHandler } from '../common/middleware';
import { z } from 'zod';
import { logAuditEvent } from '../audit/audit';

const AcceptShareSchema = z.object({
  accept: z.boolean(),
});

const acceptShareLogic: AuthenticatedHandler = async (event) => {
  const { shareId } = event.pathParameters || {};
  const { userId } = event.userContext;
  const body = event.parsedBody as z.infer<typeof AcceptShareSchema>;

  if (!shareId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing shareId' }),
    };
  }

  if (body.accept) {
    // User is ACCEPTING the share
    const { Attributes } = await docClient.send(
      new UpdateCommand({
        TableName: process.env.SHARE_INVITES_TABLE_NAME!,
        Key: { shareId },
        UpdateExpression: 'SET #status = :accepted, updatedAt = :ts',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':accepted': 'ACCEPTED',
          ':ts': new Date().toISOString(),
        },
        ConditionExpression: 'attribute_exists(shareId)', // Ensure the share exists
        ReturnValues: 'ALL_NEW',
      }),
    );

    await logAuditEvent({ userId, action: 'ACCEPT_SHARE', resource: shareId });
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Attributes) };
  } else {
    // FIX: User is REJECTING the share, so we delete the invitation record.
    await docClient.send(
      new DeleteCommand({
        TableName: process.env.SHARE_INVITES_TABLE_NAME!,
        Key: { shareId },
        ConditionExpression: 'attribute_exists(shareId)', // Ensure the share exists
      }),
    );

    // Note: We don't log an audit event for a rejected (deleted) share.
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
};

export const handler = createHandler({
  schema: AcceptShareSchema,
  handler: acceptShareLogic,
  access: (_event) => ({
    requireDevice: true,
    enforceDeviceLimit: true,
    // Note: We don't need profile-level access checks here,
    // as the user is acting on a share they received directly.
  }),
});
