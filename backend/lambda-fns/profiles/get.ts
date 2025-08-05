import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { checkPermissions } from '../common/auth';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  try {
    const userId = event.requestContext.authorizer?.jwt.claims.sub;
    const userEmail = event.requestContext.authorizer?.jwt.claims.email;
    const { profileId } = event.pathParameters || {};

    if (!profileId || !userId || !userEmail) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing parameters' }),
      };
    }

    const hasAccess = await checkPermissions(userId, userEmail, profileId, 'Viewer');
    if (!hasAccess) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Forbidden' }),
      };
    }

    const { Item } = await docClient.send(
      new GetCommand({
        TableName: process.env.PROFILES_TABLE_NAME!,
        Key: { profileId },
      }),
    );
    if (!Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Profile not found' }),
      };
    }
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(Item),
    };
  } catch (error: any) {
    console.error(error);
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
