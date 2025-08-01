import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, DeleteCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    try {
        const userId = event.requestContext.authorizer?.jwt.claims.sub;
        const { profileId } = event.pathParameters || {};
        if (!profileId || !userId) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Missing required parameters' }) };
        }

        // 1. Authorize: Check if the user is the owner of the profile
        const profileResult = await docClient.send(new GetCommand({ TableName: process.env.PROFILES_TABLE_NAME!, Key: { profileId } }));
        if (profileResult.Item?.userId !== userId) {
            return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Forbidden: Only the owner can delete a profile.' }) };
        }

        // 2. Find and delete all related share invites
        const sharesCmd = new QueryCommand({
            TableName: process.env.SHARE_INVITES_TABLE_NAME!,
            IndexName: 'profileId-index',
            KeyConditionExpression: 'profileId = :profileId',
            ExpressionAttributeValues: { ':profileId': profileId },
        });
        const { Items: sharesToDelete } = await docClient.send(sharesCmd);

        if (sharesToDelete && sharesToDelete.length > 0) {
            const deleteRequests = sharesToDelete.map(item => ({ DeleteRequest: { Key: { shareId: item.shareId } } }));
            // Batch delete in chunks of 25 (DynamoDB limit)
            for (let i = 0; i < deleteRequests.length; i += 25) {
                const chunk = deleteRequests.slice(i, i + 25);
                await docClient.send(new BatchWriteCommand({ RequestItems: { [process.env.SHARE_INVITES_TABLE_NAME!]: chunk } }));
            }
        }
        
        // --- THIS IS THE FIX ---
        // 3. Find and delete all related vaccines
        const vaccinesCmd = new QueryCommand({
            TableName: process.env.VACCINES_TABLE_NAME!,
            IndexName: 'profileId-index',
            KeyConditionExpression: 'profileId = :profileId',
            ExpressionAttributeValues: { ':profileId': profileId },
        });
        const { Items: vaccinesToDelete } = await docClient.send(vaccinesCmd);
        
        if (vaccinesToDelete && vaccinesToDelete.length > 0) {
            const deleteRequests = vaccinesToDelete.map(item => ({ DeleteRequest: { Key: { vaccineId: item.vaccineId } } }));
            // Batch delete in chunks of 25
            for (let i = 0; i < deleteRequests.length; i += 25) {
                const chunk = deleteRequests.slice(i, i + 25);
                await docClient.send(new BatchWriteCommand({ RequestItems: { [process.env.VACCINES_TABLE_NAME!]: chunk } }));
            }
        }
        // --- END OF FIX ---
        
        // 4. Finally, delete the actual profile
        await docClient.send(new DeleteCommand({ TableName: process.env.PROFILES_TABLE_NAME!, Key: { profileId } }));
        
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    } catch (error: any) {
        console.error("Error deleting profile:", error);
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) };
    }
};