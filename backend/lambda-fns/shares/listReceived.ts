import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  try {
    const userEmail = event.requestContext.authorizer?.jwt.claims.email;
    if (!userEmail) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'User is not authenticated.' }),
      };
    }

    const command = new QueryCommand({
      TableName: process.env.SHARE_INVITES_TABLE_NAME!,
      IndexName: 'inviteeEmail-index',
      KeyConditionExpression: 'inviteeEmail = :inviteeEmail',
      ExpressionAttributeValues: { ':inviteeEmail': userEmail },
    });
    const { Items } = await docClient.send(command);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(Items || []),
    };
  } catch (error: any) {
    console.error('Error fetching received shares:', error);
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
