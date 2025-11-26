
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

/** helper to resolve lambda source files */
const lf = (...p: string[]) => path.join(__dirname, '..', '..', '..', 'lambda-fns', ...p);

interface CognitoConstructProps {
  usersTable: Table;
  subscriptionsTable: Table;
  devicesTable: Table;
}

export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    const { usersTable, subscriptionsTable, devicesTable } = props;

    this.userPool = new cognito.UserPool(this, 'FamVaxUserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'FamVaxUserPoolClient', {
      userPool: this.userPool,
      authFlows: { userSrp: true, userPassword: true },
      generateSecret: false,
    });
    (this.userPoolClient.node.defaultChild as cognito.CfnUserPoolClient).enableTokenRevocation = true;

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

    this.userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmationFn);
    this.userPool.addTrigger(cognito.UserPoolOperation.PRE_TOKEN_GENERATION, preTokenGenerationFn);
    this.userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpFn);
    this.userPool.addTrigger(cognito.UserPoolOperation.PRE_AUTHENTICATION, preAuthenticationFn);
  }
}