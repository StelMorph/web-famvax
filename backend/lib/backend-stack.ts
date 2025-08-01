import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

// Helper function to create a standard Node.js Lambda function
const createNodejsFunction = (scope: Construct, id: string, entry: string, environment: { [key: string]: string }, layers: cdk.aws_lambda.ILayerVersion[]) => {
    return new lambda.NodejsFunction(scope, id, {
        runtime: Runtime.NODEJS_22_X,
        entry: path.join(__dirname, `../lambda-fns/${entry}`),
        handler: 'handler',
        layers: layers,
        environment: environment,
        bundling: {
            externalModules: ['@aws-sdk/*'], 
        },
    });
};

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- 1. Cognito User Pool ---
    const userPool = new cognito.UserPool(this, 'FamVaxUserPool', {
      userPoolName: 'FamVaxUserPool',
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: { emailStyle: cognito.VerificationEmailStyle.CODE },
      standardAttributes: { email: { required: true, mutable: true } },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const userPoolClient = new cognito.UserPoolClient(this, 'FamVaxUserPoolClient', { userPool });

    // --- 2. DynamoDB Tables ---
    const profilesTable = new dynamodb.Table(this, 'FamVaxProfilesTable', {
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    profilesTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const vaccinesTable = new dynamodb.Table(this, 'FamVaxVaccinesTable', {
      partitionKey: { name: 'vaccineId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    vaccinesTable.addGlobalSecondaryIndex({
      indexName: 'profileId-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
    });
    
    // The correct variable name is defined here
    const shareInvitesTable = new dynamodb.Table(this, 'FamVaxShareInvitesTable', {
      partitionKey: { name: 'shareId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    shareInvitesTable.addGlobalSecondaryIndex({
        indexName: 'inviteeEmail-index',
        partitionKey: { name: 'inviteeEmail', type: dynamodb.AttributeType.STRING },
    });
    shareInvitesTable.addGlobalSecondaryIndex({
        indexName: 'profileId-inviteeEmail-index',
        partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'inviteeEmail', type: dynamodb.AttributeType.STRING },
    });
    shareInvitesTable.addGlobalSecondaryIndex({
        indexName: 'profileId-index',
        partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
    });
    shareInvitesTable.addGlobalSecondaryIndex({
        indexName: 'profileId-inviteeId-index',
        partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'inviteeId', type: dynamodb.AttributeType.STRING },
    });

    // --- 3. Lambda Layer for Shared Code ---
    const commonLayer = new cdk.aws_lambda.LayerVersion(this, 'CommonLayer', {
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../lambda-fns/common')),
      compatibleRuntimes: [Runtime.NODEJS_22_X],
      description: 'Contains shared clients and auth helper functions',
    });
    
    const commonEnv = {
        PROFILES_TABLE_NAME: profilesTable.tableName,
        VACCINES_TABLE_NAME: vaccinesTable.tableName,
        SHARE_INVITES_TABLE_NAME: shareInvitesTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        COGNITO_REGION: this.region,
    };

    // --- 4. Define EACH Lambda Function Individually ---
    const listProfilesFn = createNodejsFunction(this, 'ListProfilesFn', 'profiles/list.ts', commonEnv, [commonLayer]);
    const createProfileFn = createNodejsFunction(this, 'CreateProfileFn', 'profiles/create.ts', commonEnv, [commonLayer]);
    const getProfileFn = createNodejsFunction(this, 'GetProfileFn', 'profiles/get.ts', commonEnv, [commonLayer]);
    const updateProfileFn = createNodejsFunction(this, 'UpdateProfileFn', 'profiles/update.ts', commonEnv, [commonLayer]);
    const deleteProfileFn = createNodejsFunction(this, 'DeleteProfileFn', 'profiles/delete.ts', commonEnv, [commonLayer]);
    const listVaccinesFn = createNodejsFunction(this, 'ListVaccinesFn', 'vaccines/list.ts', commonEnv, [commonLayer]);
    const createVaccineFn = createNodejsFunction(this, 'CreateVaccineFn', 'vaccines/create.ts', commonEnv, [commonLayer]);
    const updateVaccineFn = createNodejsFunction(this, 'UpdateVaccineFn', 'vaccines/update.ts', commonEnv, [commonLayer]);
    const deleteVaccineFn = createNodejsFunction(this, 'DeleteVaccineFn', 'vaccines/delete.ts', commonEnv, [commonLayer]);
    const createOrUpdateShareFn = createNodejsFunction(this, 'CreateOrUpdateShareFn', 'shares/createOrUpdate.ts', commonEnv, [commonLayer]);
    const listProfileSharesFn = createNodejsFunction(this, 'ListProfileSharesFn', 'shares/listByProfile.ts', commonEnv, [commonLayer]);
    const listReceivedSharesFn = createNodejsFunction(this, 'ListReceivedSharesFn', 'shares/listReceived.ts', commonEnv, [commonLayer]);
    const acceptShareFn = createNodejsFunction(this, 'AcceptShareFn', 'shares/accept.ts', commonEnv, [commonLayer]);
    const deleteShareFn = createNodejsFunction(this, 'DeleteShareFn', 'shares/delete.ts', commonEnv, [commonLayer]);

    // --- 5. Grant Specific IAM Permissions to Each Function ---
    
    // Profiles Permissions
    profilesTable.grantReadData(listProfilesFn);
    profilesTable.grantWriteData(createProfileFn);
    profilesTable.grantReadData(getProfileFn);
    shareInvitesTable.grantReadData(getProfileFn); // Corrected
    profilesTable.grantReadWriteData(updateProfileFn);
    shareInvitesTable.grantReadData(updateProfileFn); // Corrected
    profilesTable.grantReadWriteData(deleteProfileFn);
    shareInvitesTable.grantReadWriteData(deleteProfileFn); // Corrected
    vaccinesTable.grantReadWriteData(deleteProfileFn);
    deleteProfileFn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: [
            `${shareInvitesTable.tableArn}/index/profileId-index`,
            `${vaccinesTable.tableArn}/index/profileId-index`,
        ],
    }));

    // Vaccines Permissions
    vaccinesTable.grantReadData(listVaccinesFn);
    profilesTable.grantReadData(listVaccinesFn);
    shareInvitesTable.grantReadData(listVaccinesFn); // Corrected
    vaccinesTable.grantWriteData(createVaccineFn);
    profilesTable.grantReadData(createVaccineFn);
    shareInvitesTable.grantReadData(createVaccineFn); // Corrected
    vaccinesTable.grantReadWriteData(updateVaccineFn);
    profilesTable.grantReadData(updateVaccineFn);
    shareInvitesTable.grantReadData(updateVaccineFn); // Corrected
    vaccinesTable.grantReadWriteData(deleteVaccineFn);
    profilesTable.grantReadData(deleteVaccineFn);
    shareInvitesTable.grantReadData(deleteVaccineFn); // Corrected

    // Shares Permissions
    shareInvitesTable.grantReadWriteData(createOrUpdateShareFn); // Corrected
    profilesTable.grantReadData(createOrUpdateShareFn);
    createOrUpdateShareFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['cognito-idp:ListUsers'], resources: [userPool.userPoolArn] }));
    shareInvitesTable.grantReadData(listProfileSharesFn); // Corrected
    profilesTable.grantReadData(listProfileSharesFn);
    shareInvitesTable.grantReadData(listReceivedSharesFn); // Corrected
    shareInvitesTable.grantReadWriteData(acceptShareFn); // Corrected
    shareInvitesTable.grantReadWriteData(deleteShareFn); // Corrected

    // --- 6. API Gateway, Authorizer, and Routes ---
    const authorizer = new HttpUserPoolAuthorizer('FamVaxAuthorizer', userPool, { userPoolClients: [userPoolClient] });
    const httpApi = new apigw.HttpApi(this, 'FamVaxHttpApi', {
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
      defaultAuthorizer: authorizer,
    });

    const createIntegration = (id: string, fn: lambda.NodejsFunction) => new HttpLambdaIntegration(id, fn);

    httpApi.addRoutes({ path: '/profiles', methods: [apigw.HttpMethod.GET], integration: createIntegration('ListProfilesInt', listProfilesFn) });
    httpApi.addRoutes({ path: '/profiles', methods: [apigw.HttpMethod.POST], integration: createIntegration('CreateProfileInt', createProfileFn) });
    httpApi.addRoutes({ path: '/profiles/{profileId}', methods: [apigw.HttpMethod.GET], integration: createIntegration('GetProfileInt', getProfileFn) });
    httpApi.addRoutes({ path: '/profiles/{profileId}', methods: [apigw.HttpMethod.PUT], integration: createIntegration('UpdateProfileInt', updateProfileFn) });
    httpApi.addRoutes({ path: '/profiles/{profileId}', methods: [apigw.HttpMethod.DELETE], integration: createIntegration('DeleteProfileInt', deleteProfileFn) });
    httpApi.addRoutes({ path: '/profiles/{profileId}/vaccines', methods: [apigw.HttpMethod.GET], integration: createIntegration('ListVaccinesInt', listVaccinesFn) });
    httpApi.addRoutes({ path: '/profiles/{profileId}/vaccines', methods: [apigw.HttpMethod.POST], integration: createIntegration('CreateVaccineInt', createVaccineFn) });
    httpApi.addRoutes({ path: '/vaccines/{vaccineId}', methods: [apigw.HttpMethod.PUT], integration: createIntegration('UpdateVaccineInt', updateVaccineFn) });
    httpApi.addRoutes({ path: '/vaccines/{vaccineId}', methods: [apigw.HttpMethod.DELETE], integration: createIntegration('DeleteVaccineInt', deleteVaccineFn) });
    httpApi.addRoutes({ path: '/profiles/{profileId}/shares', methods: [apigw.HttpMethod.GET], integration: createIntegration('ListSharesInt', listProfileSharesFn) });
    httpApi.addRoutes({ path: '/profiles/{profileId}/share', methods: [apigw.HttpMethod.POST], integration: createIntegration('CreateShareInt', createOrUpdateShareFn) });
    httpApi.addRoutes({ path: '/shares/received', methods: [apigw.HttpMethod.GET], integration: createIntegration('GetReceivedInt', listReceivedSharesFn) });
    httpApi.addRoutes({ path: '/shares/{shareId}/accept', methods: [apigw.HttpMethod.PUT], integration: createIntegration('AcceptShareInt', acceptShareFn) });
    httpApi.addRoutes({ path: '/shares/{shareId}', methods: [apigw.HttpMethod.DELETE], integration: createIntegration('DeleteShareInt', deleteShareFn) });

    // --- 7. Outputs ---
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.url! });
    new cdk.CfnOutput(this, 'Region', { value: this.region });
  }
}