import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { randomUUID } from 'crypto';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    try {
        const userId = event.requestContext.authorizer?.jwt.claims.sub;
        const data = JSON.parse(event.body || '{}');
        const profileId = data.profileId || randomUUID();
        
        const command = new PutCommand({
            TableName: process.env.PROFILES_TABLE_NAME!,
            Item: { userId, profileId, ...data },
        });
        await docClient.send(command);
        return { statusCode: 201, headers: CORS_HEADERS, body: JSON.stringify({ profileId, ...data }) };
    } catch (error: any) {
        console.error(error);
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) };
    }
};