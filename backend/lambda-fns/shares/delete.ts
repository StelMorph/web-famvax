import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  try {
    const userId = event.requestContext.authorizer?.jwt.claims.sub;
    const userEmail = event.requestContext.authorizer?.jwt.claims.email;
    const { shareId } = event.pathParameters || {};

    if (!shareId || !userId || !userEmail) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing required parameters.' }),
      };
    }

    const shareResult = await docClient.send(
      new GetCommand({
        TableName: process.env.SHARE_INVITES_TABLE_NAME!,
        Key: { shareId },
      }),
    );
    if (!shareResult.Item) {
      return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    const canDelete =
      shareResult.Item.ownerId === userId || shareResult.Item.inviteeEmail === userEmail;
    if (!canDelete) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Forbidden: You cannot modify this share.',
        }),
      };
    }

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.SHARE_INVITES_TABLE_NAME!,
        Key: { shareId },
      }),
    );
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  } catch (error: any) {
    console.error('Error deleting share:', error);
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
