import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { checkPermissions } from '../common/auth';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  try {
    const userId = event.requestContext.authorizer?.jwt.claims.sub;
    const userEmail = event.requestContext.authorizer?.jwt.claims.email;
    const { vaccineId } = event.pathParameters || {};

    if (!vaccineId || !userId || !userEmail) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing required parameters.' }),
      };
    }

    const vaccineResult = await docClient.send(
      new GetCommand({
        TableName: process.env.VACCINES_TABLE_NAME!,
        Key: { vaccineId },
      }),
    );
    const profileId = vaccineResult.Item?.profileId;
    if (!profileId) {
      // If the record doesn't exist, the goal is achieved.
      return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    const canEdit = await checkPermissions(userId, userEmail, profileId, 'Editor');
    if (!canEdit) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Forbidden: You do not have permission to delete this record.',
        }),
      };
    }

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.VACCINES_TABLE_NAME!,
        Key: { vaccineId },
      }),
    );
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  } catch (error: any) {
    console.error('Error deleting vaccine:', error);
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
