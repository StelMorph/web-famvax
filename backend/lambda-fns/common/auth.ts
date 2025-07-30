import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './clients';

export type Role = 'Viewer' | 'Editor' | 'Owner';

/**
 * Checks if a user has the required permission level to access a profile.
 * Owners have all permissions. Shared users are checked against their role.
 */
export const checkPermissions = async (userId: string, userEmail: string, profileId: string, requiredRole: Role): Promise<boolean> => {
    // 1. Check if the user is the owner of the profile
    const profileResult = await docClient.send(new GetCommand({
        TableName: process.env.PROFILES_TABLE_NAME!,
        Key: { profileId },
    }));

    if (profileResult.Item && profileResult.Item.userId === userId) {
        return true; // Owner always has permission
    }

    // 2. If not the owner, check for an accepted share invite
    const shareCommand = new QueryCommand({
        TableName: process.env.SHARE_INVITES_TABLE_NAME!,
        IndexName: 'profileId-inviteeEmail-index',
        KeyConditionExpression: 'profileId = :profileId and inviteeEmail = :inviteeEmail',
        FilterExpression: '#status = :status_accepted',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':profileId': profileId,
            ':inviteeEmail': userEmail,
            ':status_accepted': 'ACCEPTED'
        },
    });

    const { Items: shareItems } = await docClient.send(shareCommand);
    const share = shareItems?.[0];

    if (!share) { return false; } // No accepted share found

    // 3. Check if the user's role meets the required level
    const userRole = share.role;
    if (requiredRole === 'Viewer') return userRole === 'Viewer' || userRole === 'Editor';
    if (requiredRole === 'Editor') return userRole === 'Editor';

    return false; // Default to no permission
};