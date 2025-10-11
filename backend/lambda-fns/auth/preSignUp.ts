// backend/lambda-fns/auth/preSignUp.ts
import { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from 'aws-lambda';

// This Regular Expression matches a string that contains ONLY standard ASCII characters.
// \x00-\x7F is the valid range for ASCII characters (English letters, numbers, common symbols).
const asciiRegex = /^[\x00-\x7F]*$/;

export const handler: PreSignUpTriggerHandler = async (
  event: PreSignUpTriggerEvent,
): Promise<PreSignUpTriggerEvent> => {
  console.log('Pre Sign-up Event:', JSON.stringify(event, null, 2));

  // For the PreSignUp trigger, the password is not directly available for security reasons.
  // The password MUST be passed from the frontend in the 'validationData' during the signUp call.
  const password = event.request.validationData?.password;

  // This is the server-side security check.
  if (!password || !asciiRegex.test(password)) {
    // If the password contains any non-ASCII characters, reject the sign-up.
    // The error message thrown here will be sent back to the frontend.
    throw new Error('Password may only contain English letters, numbers, and common symbols.');
  }

  // If the password is valid, allow the sign-up to proceed.
  // We can also auto-confirm the user here as a best practice, since they passed our custom checks.
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
