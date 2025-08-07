import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
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
        body: JSON.stringify({ message: 'Missing required parameters.' }),
      };
    }

    const canView = await checkPermissions(userId, userEmail, profileId, 'Viewer');
    if (!canView) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Forbidden' }),
      };
    }

    const command = new QueryCommand({
      TableName: process.env.VACCINES_TABLE_NAME!,
      IndexName: 'profileId-index',
      KeyConditionExpression: 'profileId = :profileId',
      ExpressionAttributeValues: { ':profileId': profileId },
    });
    const { Items } = await docClient.send(command);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(Items || []),
    };
  } catch (error: any) {
    console.error('Error fetching vaccines:', error);
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
