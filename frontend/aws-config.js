const awsConfig = {
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    region: import.meta.env.VITE_AWS_REGION,
  },
  api: {
    invokeUrl: import.meta.env.VITE_API_URL,
  },
};

export default awsConfig;
