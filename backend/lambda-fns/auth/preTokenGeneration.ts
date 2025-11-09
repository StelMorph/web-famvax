// backend/lambda-fns/auth/preTokenGeneration.ts
import { PreTokenGenerationTriggerEvent, PreTokenGenerationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: PreTokenGenerationTriggerHandler = async (
  event: PreTokenGenerationTriggerEvent,
): Promise<PreTokenGenerationTriggerEvent> => {
  const userId = event.request.userAttributes?.sub || event.userName;
  let subscriptionStatus = 'none';

  try {
    const { Items } = await ddb.send(
      new QueryCommand({
        TableName: process.env.SUBSCRIPTIONS_TABLE_NAME!,
        KeyConditionExpression: 'userId = :u',
        FilterExpression: '#status = :active OR #status = :trialing',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':u': userId,
          ':active': 'active',
          ':trialing': 'trialing',
        },
        Limit: 1,
      }),
    );
    if (Items && Items.length > 0) {
      subscriptionStatus = 'active';
    }
  } catch (e) {
    console.warn('Subscription check failed:', e);
  }

  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'custom:subscription_status': subscriptionStatus,
      },
    },
  };

  return event;
};
