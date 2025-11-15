// backend/lambda-fns/user-sync/postConfirmation.ts
import { PostConfirmationConfirmSignUpTriggerEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (
  event: PostConfirmationConfirmSignUpTriggerEvent,
): Promise<PostConfirmationConfirmSignUpTriggerEvent> => {
  console.log('Cognito Post-Confirmation Event:', JSON.stringify(event, null, 2));

  // Ensure this trigger only runs for Confirmed sign-ups, not other post-confirmation events.
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    console.log('Not a ConfirmSignUp trigger. Skipping.');
    return event;
  }

  const { sub: userId, email } = event.request.userAttributes;
  const username = event.userName;

  if (!userId || !email || !username) {
    console.error('Missing required user attributes from Cognito event.');
    return event; // Return event to not break the Cognito flow
  }

  const now = new Date().toISOString();

  const params = {
    TableName: process.env.USERS_TABLE_NAME!,
    Item: {
      userId,
      email,
      username,
      createdAt: now,
      updatedAt: now,
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    console.log(`Successfully created user profile for ${userId}`);
  } catch (error) {
    console.error(`Error creating user profile for ${userId}:`, error);
    // Note: It's crucial to still return the event to not fail the Cognito flow.
    // You should have monitoring/alarms on this function's errors.
  }

  return event;
};
