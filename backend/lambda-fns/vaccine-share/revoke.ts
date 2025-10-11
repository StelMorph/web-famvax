import { z } from 'zod';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { createHandler } from '../common/middleware';
import { docClient } from '../common/clients';

const TABLE = process.env.VACCINE_SHARE_LINKS_TABLE_NAME!;
const JSON_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

const handlerLogic = async (event: any) => {
  try {
    const { token } = event.pathParameters || {};
    if (!token) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ message: 'Missing token' }),
      };
    }

    await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { token } }));
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    console.error('revoke.vaccine-share error', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

export const handler = createHandler({
  schema: z.object({}),
  handler: handlerLogic,
});
