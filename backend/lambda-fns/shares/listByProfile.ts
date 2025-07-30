import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    try {
        const userId = event.requestContext.authorizer?.jwt.claims.sub;
        const { profileId } = event.pathParameters || {};
        if (!profileId || !userId) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Missing required parameters.' }) };
        }

        const profileResult = await docClient.send(new GetCommand({ TableName: process.env.PROFILES_TABLE_NAME!, Key: { profileId } }));
        if (profileResult.Item?.userId !== userId) {
            return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Forbidden: Only the owner can view shares.' }) };
        }

        const command = new QueryCommand({
            TableName: process.env.SHARE_INVITES_TABLE_NAME!,
            IndexName: 'profileId-index',
            KeyConditionExpression: 'profileId = :profileId',
            ExpressionAttributeValues: { ':profileId': profileId },
        });
        const { Items } = await docClient.send(command);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Items || []) };
    } catch (error: any) {
        console.error("Error listing profile shares:", error);
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) };
    }
};