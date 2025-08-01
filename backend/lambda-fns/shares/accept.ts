import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Missing required parameters.' }) };
        }

        const shareResult = await docClient.send(new GetCommand({ TableName: process.env.SHARE_INVITES_TABLE_NAME!, Key: { shareId } }));
        const currentInvite = shareResult.Item;

        if (!currentInvite || currentInvite.inviteeEmail !== userEmail) {
            return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Forbidden: You are not the invitee or the invite does not exist.' }) };
        }
        
        const updateCmd = new UpdateCommand({
            TableName: process.env.SHARE_INVITES_TABLE_NAME!,
            Key: { shareId },
            UpdateExpression: 'set #status = :status, #inviteeId = :inviteeId, #updatedAt = :ts',
            ExpressionAttributeNames: { '#status': 'status', '#inviteeId': 'inviteeId', '#updatedAt': 'updatedAt' },
            ExpressionAttributeValues: { ':status': 'ACCEPTED', ':inviteeId': userId, ':ts': new Date().toISOString() },
            ReturnValues: 'ALL_NEW',
        });
        
        const { Attributes } = await docClient.send(updateCmd);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(Attributes) };
    } catch (error: any) {
        console.error("Error accepting share:", error);
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) };
    }
};