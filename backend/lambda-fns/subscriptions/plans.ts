// backend/lambda-fns/subscriptions/plans.ts
import { z } from 'zod';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { createHandler, AuthenticatedHandler, WrappedEvent } from '../common/middleware';
import { CORS_HEADERS } from '../common/clients';

const ssmClient = new SSMClient({ region: process.env.AWS_REGION });

// Helper to fetch a single parameter from SSM
const getSsmParameter = async (name: string): Promise<string> => {
  const command = new GetParameterCommand({ Name: name, WithDecryption: true });
  const response = await ssmClient.send(command);
  if (!response.Parameter?.Value) {
    throw new Error(`SSM Parameter not found: ${name}`);
  }
  return response.Parameter.Value;
};

const getPlansLogic: AuthenticatedHandler = async (_event: WrappedEvent) => {
  try {
    const parameterName = `/famvax/dev/stripe/price-id/monthly-aed`;
    const monthlyPriceId = await getSsmParameter(parameterName);

    const responsePayload = {
      currency: 'aed',
      monthly: {
        priceId: monthlyPriceId,
        amount: 1599, // 15.99 AED
        interval: 'month',
      },
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(responsePayload),
    };
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Could not retrieve subscription plans.', error: error.message }),
    };
  }
};

export const handler = createHandler({
  schema: z.object({}), // No body schema needed for a GET request
  handler: getPlansLogic,
  access: { requireDevice: true }, // User must be logged in
});