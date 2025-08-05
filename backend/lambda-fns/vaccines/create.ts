import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { checkPermissions } from '../common/auth';
import { randomUUID } from 'crypto';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  try {
    const userId = event.requestContext.authorizer?.jwt.claims.sub;
    const userEmail = event.requestContext.authorizer?.jwt.claims.email;
    const { profileId } = event.pathParameters || {};
    const data = JSON.parse(event.body || '{}');

    if (!profileId || !userId || !userEmail) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing required parameters.' }),
      };
    }

    const canEdit = await checkPermissions(userId, userEmail, profileId, 'Editor');
    if (!canEdit) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Forbidden: You do not have permission to add records to this profile.',
        }),
      };
    }

    const vaccineId = randomUUID();
    await docClient.send(
      new PutCommand({
        TableName: process.env.VACCINES_TABLE_NAME!,
        Item: { profileId, vaccineId, ...data },
      }),
    );
    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ vaccineId, ...data }),
    };
  } catch (error: any) {
    console.error('Error creating vaccine:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
      }),
    };
  }
};
