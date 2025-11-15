import { z } from 'zod';
import { randomUUID } from 'crypto';
import { QueryCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHandler } from '../common/middleware';
import { docClient } from '../common/clients';

const TABLE = process.env.VACCINE_SHARE_LINKS_TABLE_NAME!;
const JSON_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

const bodySchema = z.object({
  days: z.number().int().min(1).max(30).default(7),
});

const handlerLogic = async (event: any) => {
  try {
    const { profileId, vaccineId } = event.pathParameters || {};
    if (!profileId || !vaccineId) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ message: 'Missing profileId/vaccineId' }),
      };
    }

    const parsed = bodySchema.safeParse(event.body ? JSON.parse(event.body) : {});
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ message: 'Invalid body' }),
      };
    }
    const days = parsed.data.days;

    const now = Math.floor(Date.now() / 1000);
    const expiresAtEpoch = now + days * 86400;

    // Remove any existing (active) links for this vaccine (we want a single link at a time)
    const q = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'vaccineId-index',
        KeyConditionExpression: 'vaccineId = :v',
        ExpressionAttributeValues: { ':v': vaccineId },
      }),
    );
    if (q.Items?.length) {
      await Promise.all(
        q.Items.map((it) =>
          docClient.send(
            new DeleteCommand({ TableName: TABLE, Key: { token: (it as any).token } }),
          ),
        ),
      );
    }

    const token = randomUUID();

    await docClient.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          token,
          profileId,
          vaccineId,
          createdAtEpoch: now,
          expiresAtEpoch,
        },
      }),
    );

    const payload = {
      token,
      expiresAt: expiresAtEpoch,
      publicPath: `/public/vaccine/${token}`,
      pdfPath: `/public/vaccine/${token}/pdf`,
    };

    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(payload) };
  } catch (err: any) {
    console.error('create.vaccine-share error', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

export const handler = createHandler({
  schema: z.object({}), // body validated inside
  handler: handlerLogic,
});
