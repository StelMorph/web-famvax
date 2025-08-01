// src/aws-config.js

const awsConfig = {
    cognito: {
      userPoolId: 'eu-north-1_CuJrzzolT',
      userPoolClientId: '5vc06v3urihkdqqesfooo2qj2d',
      region: 'eu-north-1',
    },
    api: {
      // Corrected URL without the trailing slash
      invokeUrl: 'https://3f7lur00l1.execute-api.eu-north-1.amazonaws.com',
    },
  };
  
  export default awsConfig;