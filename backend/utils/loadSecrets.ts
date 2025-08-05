import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import dotenv from 'dotenv';

dotenv.config({ path: './frontend/.env' }); // point to your frontend env!

const ssm = new SSMClient({ region: process.env.AWS_REGION || 'eu-north-1' });

async function getSSMValue(name: string): Promise<string | undefined> {
  try {
    const result = await ssm.send(
      new GetParameterCommand({
        Name: name,
        WithDecryption: true,
      }),
    );
    return result.Parameter?.Value;
  } catch (err) {
    console.warn(`⚠️ Failed to get ${name} from SSM, using .env`);
    return undefined;
  }
}

export async function loadSecrets() {
  process.env.VITE_COGNITO_CLIENT_ID =
    (await getSSMValue('/famvax/dev/VITE_COGNITO_CLIENT_ID')) || process.env.VITE_COGNITO_CLIENT_ID;

  process.env.VITE_COGNITO_USER_POOL_ID =
    (await getSSMValue('/famvax/dev/VITE_COGNITO_USER_POOL_ID')) ||
    process.env.VITE_COGNITO_USER_POOL_ID;

  process.env.VITE_API_URL =
    (await getSSMValue('/famvax/dev/VITE_API_URL')) || process.env.VITE_API_URL;
}
