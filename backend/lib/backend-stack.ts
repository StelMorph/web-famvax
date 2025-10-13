import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';

import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

import { createLambdaFactory } from './lambda-baseline';

/** helper to resolve lambda source files */
const lf = (...p: string[]) => path.join(__dirname, '..', 'lambda-fns', ...p);

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // =====================================================
    // DynamoDB tables (existing)
    // =====================================================
    const idempotencyTable = new dynamodb.Table(this, 'IdempotencyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const profilesTable = new dynamodb.Table(this, 'ProfilesTable', {
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    profilesTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const vaccinesTable = new dynamodb.Table(this, 'VaccinesTable', {
      partitionKey: { name: 'vaccineId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    vaccinesTable.addGlobalSecondaryIndex({
      indexName: 'profileId-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
    });

    const shareInvitesTable = new dynamodb.Table(this, 'ShareInvitesTable', {
      partitionKey: { name: 'shareId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    shareInvitesTable.addGlobalSecondaryIndex({
      indexName: 'inviteeEmail-index',
      partitionKey: { name: 'inviteeEmail', type: dynamodb.AttributeType.STRING },
    });
    shareInvitesTable.addGlobalSecondaryIndex({
      indexName: 'profileId-inviteeId-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'inviteeId', type: dynamodb.AttributeType.STRING },
    });

    const devicesTable = new dynamodb.Table(this, 'DevicesTable', {
      partitionKey: { name: 'deviceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    devicesTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const subscriptionsTable = new dynamodb.Table(this, 'SubscriptionsTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const auditEventsTable = new dynamodb.Table(this, 'AuditEventsTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ts', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    auditEventsTable.addGlobalSecondaryIndex({
      indexName: 'resource-ts-index',
      partitionKey: { name: 'resource', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ts', type: dynamodb.AttributeType.NUMBER },
    });

    // =====================================================
    // NEW: table for vaccine single-record sharing (by token)
    // =====================================================
    const vaccineShareLinksTable = new dynamodb.Table(this, 'VaccineShareLinksTable', {
      partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expiresAtEpoch',
    });
    vaccineShareLinksTable.addGlobalSecondaryIndex({
      indexName: 'vaccineId-index',
      partitionKey: { name: 'vaccineId', type: dynamodb.AttributeType.STRING },
    });

    // =====================================================
    // Cognito (existing)
    // =====================================================
    const userPool = new cognito.UserPool(this, 'FamVaxUserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'FamVaxUserPoolClient', {
      userPool,
      authFlows: { userSrp: true, userPassword: true },
      generateSecret: false,
    });
    (userPoolClient.node.defaultChild as cognito.CfnUserPoolClient).enableTokenRevocation = true;

    // Triggers
    const postConfirmationFn = new NodejsFunction(this, 'PostConfirmationHandler', {
      entry: lf('auth/postConfirmation.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
        SES_FROM_ADDRESS: process.env.SES_FROM_ADDRESS || '',
        SES_FROM_NAME: process.env.SES_FROM_NAME || '',
      },
    });
    const preTokenGenerationFn = new NodejsFunction(this, 'PreTokenGenerationHandler', {
      entry: lf('auth/preTokenGeneration.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: { SUBSCRIPTIONS_TABLE_NAME: subscriptionsTable.tableName },
    });
    const preSignUpFn = new NodejsFunction(this, 'PreSignUpHandler', {
      entry: lf('auth/preSignUp.ts'),
      runtime: Runtime.NODEJS_18_X,
    });
    const preAuthenticationFn = new NodejsFunction(this, 'PreAuthenticationHandler', {
      entry: lf('auth/preAuthentication.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {
        DEVICES_TABLE_NAME: devicesTable.tableName,
        SUBSCRIPTIONS_TABLE_NAME: subscriptionsTable.tableName,
        DEVICE_LIMIT_FREE: process.env.DEVICE_LIMIT_FREE || '1',
      },
    });

    usersTable.grantWriteData(postConfirmationFn);
    subscriptionsTable.grantReadData(preTokenGenerationFn);
    devicesTable.grantReadWriteData(preAuthenticationFn);
    subscriptionsTable.grantReadData(preAuthenticationFn);

    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmationFn);
    userPool.addTrigger(cognito.UserPoolOperation.PRE_TOKEN_GENERATION, preTokenGenerationFn);
    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpFn);
    userPool.addTrigger(cognito.UserPoolOperation.PRE_AUTHENTICATION, preAuthenticationFn);

    // =====================================================
    // Lambda factory & common env
    // =====================================================
    const makeFn = createLambdaFactory(this, idempotencyTable.tableName);

    const commonEnv = {
      USERS_TABLE_NAME: usersTable.tableName,
      PROFILES_TABLE_NAME: profilesTable.tableName,
      VACCINES_TABLE_NAME: vaccinesTable.tableName,
      SHARE_INVITES_TABLE_NAME: shareInvitesTable.tableName,
      DEVICES_TABLE_NAME: devicesTable.tableName,
      SUBSCRIPTIONS_TABLE_NAME: subscriptionsTable.tableName,
      AUDIT_EVENTS_TABLE_NAME: auditEventsTable.tableName,
      USER_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      VACCINE_SHARE_LINKS_TABLE_NAME: vaccineShareLinksTable.tableName,
      DEVICE_LIMIT_FREE: process.env.DEVICE_LIMIT_FREE || '1',
    };

    // =====================================================
    // App Lambdas (existing)
    // =====================================================
    // profiles
    const listProfilesFn = makeFn('ListProfilesFn', 'profiles/list.ts', commonEnv);
    const createProfileFn = makeFn('CreateProfileFn', 'profiles/create.ts', commonEnv);
    const getProfileFn = makeFn('GetProfileFn', 'profiles/get.ts', commonEnv);
    const updateProfileFn = makeFn('UpdateProfileFn', 'profiles/update.ts', commonEnv);
    const deleteProfileFn = makeFn('DeleteProfileFn', 'profiles/delete.ts', commonEnv);

    // vaccines
    const listVaccinesFn = makeFn('ListVaccinesFn', 'vaccines/list.ts', commonEnv);
    const createVaccineFn = makeFn('CreateVaccineFn', 'vaccines/create.ts', commonEnv);
    const updateVaccineFn = makeFn('UpdateVaccineFn', 'vaccines/update.ts', commonEnv);
    const deleteVaccineFn = makeFn('DeleteVaccineFn', 'vaccines/delete.ts', commonEnv);
    const restoreVaccineFn = makeFn('RestoreVaccineFn', 'vaccines/restore.ts', commonEnv);

    // shares (profile)
    const createOrUpdateShareFn = makeFn(
      'CreateOrUpdateShareFn',
      'shares/createOrUpdate.ts',
      commonEnv,
    );
    createOrUpdateShareFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:ListUsers'],
        resources: [userPool.userPoolArn],
      }),
    );
    const listProfileSharesFn = makeFn('ListProfileSharesFn', 'shares/listByProfile.ts', commonEnv);
    const listReceivedSharesFn = makeFn(
      'ListReceivedSharesFn',
      'shares/listReceived.ts',
      commonEnv,
    );
    const acceptShareFn = makeFn('AcceptShareFn', 'shares/accept.ts', commonEnv);
    const deleteShareFn = makeFn('DeleteShareFn', 'shares/delete.ts', commonEnv);

    // subscriptions
    const createSubscriptionFn = makeFn(
      'CreateSubscriptionFn',
      'subscriptions/create.ts',
      commonEnv,
    );
    const getSubscriptionFn = makeFn('GetSubscriptionFn', 'subscriptions/get.ts', commonEnv);
    const cancelSubscriptionFn = makeFn(
      'CancelSubscriptionFn',
      'subscriptions/cancel.ts',
      commonEnv,
    );
    const getSubscriptionHistoryFn = makeFn(
      'GetSubscriptionHistoryFn',
      'subscriptions/history.ts',
      commonEnv,
    );
    const updateSubscriptionStatusFn = makeFn(
      'UpdateSubscriptionStatusFn',
      'subscriptions/updateStatus.ts',
      commonEnv,
    );

    // devices
    const listDevicesFn = makeFn('ListDevicesFn', 'devices/list.ts', commonEnv);
    const revokeDeviceFn = makeFn('RevokeDeviceFn', 'devices/revoke.ts', commonEnv);

    // auth finisher + overview
    const completeLoginFn = makeFn('CompleteLoginFn', 'auth/complete-login.ts', commonEnv);
    const getOverviewFn = makeFn('GetOverviewFn', 'user/overview.ts', commonEnv);

    // FIX: Add a new Lambda function for fetching the audit log.
    const listAuditEventsFn = makeFn('ListAuditEventsFn', 'audit/listByProfile.ts', commonEnv);

    // =====================================================
    // NEW: Vaccine single-record share Lambdas
    // =====================================================
    const createVaccineShareFn = makeFn(
      'CreateVaccineShareFn',
      'vaccine-share/create.ts',
      commonEnv,
    );
    const revokeVaccineShareFn = makeFn(
      'RevokeVaccineShareFn',
      'vaccine-share/revoke.ts',
      commonEnv,
    );
    const getPublicVaccineFn = makeFn(
      'GetPublicVaccineFn',
      'vaccine-share/getPublic.ts',
      commonEnv,
    );

    // SPECIAL: PDF lambda — custom NodejsFunction with bundling so .ttf can be imported
    const getPublicVaccinePdfFn = new NodejsFunction(this, 'GetPublicVaccinePdfFn', {
      entry: lf('vaccine-share/getPdf.ts'),
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      timeout: Duration.seconds(20),
      environment: {
        ...commonEnv,
        IDEMPOTENCY_TABLE_NAME: idempotencyTable.tableName,
      },
      bundling: {
        minify: true,
        target: 'node18',
        // IMPORTANT: make the bundle CommonJS so pdfkit’s CJS requires work at runtime
        format: OutputFormat.CJS,
        // Inline .ttf as data URL so pdfkit/fontkit can load the font file
        loader: { '.ttf': 'dataurl' },
        // If needed, you could externalize and ship via a layer instead:
        // externalModules: ["@pdfkit/fontkit"],
      },
    });

    // quick public health-check + catch-all (to keep CORS OK on typos)
    const publicPingFn = new NodejsFunction(this, 'PublicPingFn', {
      entry: lf('vaccine-share/ping.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {},
    });
    const publicNotFoundFn = new NodejsFunction(this, 'PublicNotFoundFn', {
      entry: lf('vaccine-share/notFound.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {},
    });

    // =====================================================
    // Grants
    // =====================================================
    const grantRW = (fn: NodejsFunction) => {
      profilesTable.grantReadWriteData(fn);
      vaccinesTable.grantReadWriteData(fn);
      shareInvitesTable.grantReadWriteData(fn);
      devicesTable.grantReadWriteData(fn);
      subscriptionsTable.grantReadWriteData(fn);
      auditEventsTable.grantWriteData(fn);
      idempotencyTable.grantReadWriteData(fn);
    };
    [
      listProfilesFn,
      createProfileFn,
      getProfileFn,
      updateProfileFn,
      deleteProfileFn,
      listVaccinesFn,
      createVaccineFn,
      updateVaccineFn,
      deleteVaccineFn,
      restoreVaccineFn,
      createOrUpdateShareFn,
      listProfileSharesFn,
      listReceivedSharesFn,
      acceptShareFn,
      deleteShareFn,
      createSubscriptionFn,
      getSubscriptionFn,
      cancelSubscriptionFn,
      getSubscriptionHistoryFn,
      updateSubscriptionStatusFn,
      listDevicesFn,
      revokeDeviceFn,
      completeLoginFn,
      getOverviewFn,
      createVaccineShareFn,
      revokeVaccineShareFn,
      listAuditEventsFn, // Add new function to the list
    ].forEach(grantRW);

    // Grant specific read access to the audit function for the new GSI
    auditEventsTable.grantReadData(listAuditEventsFn);

    // precise read grants for public viewers
    vaccineShareLinksTable.grantReadData(getPublicVaccineFn);
    vaccinesTable.grantReadData(getPublicVaccineFn);
    profilesTable.grantReadData(getPublicVaccineFn);

    // also for the PDF endpoint + RW for create/revoke
    vaccineShareLinksTable.grantReadData(getPublicVaccinePdfFn);
    vaccinesTable.grantReadData(getPublicVaccinePdfFn);
    profilesTable.grantReadData(getPublicVaccinePdfFn);

    vaccineShareLinksTable.grantReadWriteData(createVaccineShareFn);
    vaccineShareLinksTable.grantReadWriteData(revokeVaccineShareFn);

    // =====================================================
    // Auth API (Cognito authorizer)
    // =====================================================
    const authorizer = new HttpUserPoolAuthorizer('UserPoolAuth', userPool, {
      userPoolClients: [userPoolClient],
    });

    const api = new HttpApi(this, 'FamVaxHttpApi', {
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ['*'],
        maxAge: Duration.days(1),
      },
      defaultAuthorizer: authorizer,
    });

    const integ = (id: string, fn: NodejsFunction) => new HttpLambdaIntegration(id, fn);

    // overview
    api.addRoutes({
      path: '/me/overview',
      methods: [HttpMethod.GET],
      integration: integ('GetOverviewInt', getOverviewFn),
    });

    // profiles
    api.addRoutes({
      path: '/profiles',
      methods: [HttpMethod.GET],
      integration: integ('ListProfilesInt', listProfilesFn),
    });
    api.addRoutes({
      path: '/profiles',
      methods: [HttpMethod.POST],
      integration: integ('CreateProfileInt', createProfileFn),
    });
    api.addRoutes({
      path: '/profiles/{profileId}',
      methods: [HttpMethod.GET],
      integration: integ('GetProfileInt', getProfileFn),
    });
    api.addRoutes({
      path: '/profiles/{profileId}',
      methods: [HttpMethod.PUT],
      integration: integ('UpdateProfileInt', updateProfileFn),
    });
    api.addRoutes({
      path: '/profiles/{profileId}',
      methods: [HttpMethod.DELETE],
      integration: integ('DeleteProfileInt', deleteProfileFn),
    });

    // FIX: Add the new API route for the audit log.
    api.addRoutes({
      path: '/profiles/{profileId}/audit-log',
      methods: [HttpMethod.GET],
      integration: integ('ListAuditEventsInt', listAuditEventsFn),
    });

    // vaccines
    api.addRoutes({
      path: '/profiles/{profileId}/vaccines',
      methods: [HttpMethod.GET],
      integration: integ('ListVaccinesInt', listVaccinesFn),
    });
    api.addRoutes({
      path: '/profiles/{profileId}/vaccines',
      methods: [HttpMethod.POST],
      integration: integ('CreateVaccineInt', createVaccineFn),
    });
    api.addRoutes({
      path: '/profiles/{profileId}/vaccines/{vaccineId}',
      methods: [HttpMethod.PUT],
      integration: integ('UpdateVaccineInt', updateVaccineFn),
    });
    api.addRoutes({
      path: '/profiles/{profileId}/vaccines/{vaccineId}',
      methods: [HttpMethod.DELETE],
      integration: integ('DeleteVaccineInt', deleteVaccineFn),
    });
    api.addRoutes({
      path: '/profiles/{profileId}/vaccines/{vaccineId}/restore',
      methods: [HttpMethod.POST],
      integration: integ('RestoreVaccineInt', restoreVaccineFn),
    });

    // shares
    api.addRoutes({
      path: '/profiles/{profileId}/shares',
      methods: [HttpMethod.GET],
      integration: integ('ListSharesInt', listProfileSharesFn),
    });
    api.addRoutes({
      path: '/profiles/{profileId}/share',
      methods: [HttpMethod.POST],
      integration: integ('CreateShareInt', createOrUpdateShareFn),
    });
    api.addRoutes({
      path: '/shares/received',
      methods: [HttpMethod.GET],
      integration: integ('GetReceivedInt', listReceivedSharesFn),
    });
    api.addRoutes({
      path: '/shares/{shareId}/accept',
      methods: [HttpMethod.PUT],
      integration: integ('AcceptShareInt', acceptShareFn),
    });
    api.addRoutes({
      path: '/shares/{shareId}',
      methods: [HttpMethod.DELETE],
      integration: integ('DeleteShareInt', deleteShareFn),
    });

    // subscriptions
    api.addRoutes({
      path: '/subscription',
      methods: [HttpMethod.POST],
      integration: integ('CreateSubscriptionInt', createSubscriptionFn),
    });
    api.addRoutes({
      path: '/subscription',
      methods: [HttpMethod.GET],
      integration: integ('GetSubscriptionInt', getSubscriptionFn),
    });
    api.addRoutes({
      path: '/subscription/history',
      methods: [HttpMethod.GET],
      integration: integ('GetSubscriptionHistoryInt', getSubscriptionHistoryFn),
    });
    api.addRoutes({
      path: '/subscription',
      methods: [HttpMethod.DELETE],
      integration: integ('CancelSubscriptionInt', cancelSubscriptionFn),
    });
    api.addRoutes({
      path: '/subscription',
      methods: [HttpMethod.PATCH],
      integration: integ('UpdateSubscriptionStatusInt', updateSubscriptionStatusFn),
    });

    // devices
    api.addRoutes({
      path: '/devices',
      methods: [HttpMethod.GET],
      integration: integ('ListDevicesInt', listDevicesFn),
    });
    api.addRoutes({
      path: '/devices/{deviceId}',
      methods: [HttpMethod.DELETE],
      integration: integ('RevokeDeviceInt', revokeDeviceFn),
    });

    // auth finisher
    api.addRoutes({
      path: '/auth/complete-login',
      methods: [HttpMethod.POST],
      integration: integ('CompleteLoginInt', completeLoginFn),
    });

    // NEW (AUTH): create/revoke single-vaccine share link
    api.addRoutes({
      path: '/profiles/{profileId}/vaccines/{vaccineId}/share',
      methods: [HttpMethod.POST],
      integration: integ('CreateVaccineShareInt', createVaccineShareFn),
    });
    api.addRoutes({
      path: '/vaccine-share/{token}',
      methods: [HttpMethod.DELETE],
      integration: integ('RevokeVaccineShareInt', revokeVaccineShareFn),
    });

    // =====================================================
    // Public API (no authorizer)
    // =====================================================
    const publicApi = new HttpApi(this, 'FamVaxPublicHttpApi', {
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ['*'],
        maxAge: Duration.days(1),
      },
    });

    const publicInteg = (id: string, fn: NodejsFunction) => new HttpLambdaIntegration(id, fn);

    // health check
    publicApi.addRoutes({
      path: '/public/ping',
      methods: [HttpMethod.GET],
      integration: publicInteg('PublicPingInt', publicPingFn),
    });

    // public viewer JSON + PDF
    publicApi.addRoutes({
      path: '/public/vaccine/{token}',
      methods: [HttpMethod.GET],
      integration: publicInteg('GetPublicVaccineInt', getPublicVaccineFn),
    });
    publicApi.addRoutes({
      path: '/public/vaccine/{token}/pdf',
      methods: [HttpMethod.GET],
      integration: publicInteg('GetPublicVaccinePdfInt', getPublicVaccinePdfFn),
    });

    // catch-all for other /public/* to ensure CORS even on typos
    publicApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration: publicInteg('PublicNotFoundInt', publicNotFoundFn),
    });

    // =====================================================
    // Outputs
    // =====================================================
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url! });
    new cdk.CfnOutput(this, 'PublicApiUrl', { value: publicApi.url! });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'Region', { value: this.region });
  }
}
