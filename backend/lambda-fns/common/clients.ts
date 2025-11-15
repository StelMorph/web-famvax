// backend/lambda-fns/common/clients.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// Initialize once and export to be reused by all functions
export const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION,
});

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  // include device headers by default (dynamic CORS in middleware will still override/mirror)
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Id, X-Device-Info',
};

