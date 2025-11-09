import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';

import { Duration } from 'aws-cdk-lib';
import { OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';

/** helper to resolve lambda source files */
const lf = (...p: string[]) => path.join(__dirname, '..', '..', '..', 'lambda-fns', ...p);

const makeFn = (scope: Construct, id: string, entry: string, env: { [key: string]: string }, idempotencyTableName: string) => {
  const fn = new NodejsFunction(scope, id, {
    entry: lf(entry),
    runtime: Runtime.NODEJS_18_X,
    environment: {
      ...env,
      IDEMPOTENCY_TABLE_NAME: idempotencyTableName,
    },
  });
  return fn;
};

interface LambdaConstructProps {
  idempotencyTable: Table;
  usersTable: Table;
  profilesTable: Table;
  vaccinesTable: Table;
  shareInvitesTable: Table;
  devicesTable: Table;
  subscriptionsTable: Table;
  auditEventsTable: Table;
  vaccineShareLinksTable: Table;
  userPoolId: string;
  userPoolClientId: string;
}

export class LambdaConstruct extends Construct {

  public readonly listProfilesFn: NodejsFunction;
  public readonly createProfileFn: NodejsFunction;
  public readonly getProfileFn: NodejsFunction;
  public readonly updateProfileFn: NodejsFunction;
  public readonly deleteProfileFn: NodejsFunction;
  public readonly listVaccinesFn: NodejsFunction;
  public readonly createVaccineFn: NodejsFunction;
  public readonly updateVaccineFn: NodejsFunction;
  public readonly deleteVaccineFn: NodejsFunction;
  public readonly restoreVaccineFn: NodejsFunction;
  public readonly createOrUpdateShareFn: NodejsFunction;
  public readonly listProfileSharesFn: NodejsFunction;
  public readonly listReceivedSharesFn: NodejsFunction;
  public readonly acceptShareFn: NodejsFunction;
  public readonly deleteShareFn: NodejsFunction;
  public readonly createSubscriptionFn: NodejsFunction;
  public readonly getSubscriptionFn: NodejsFunction;
  public readonly getSubscriptionPlansFn: NodejsFunction;
  public readonly cancelSubscriptionFn: NodejsFunction;
  public readonly getSubscriptionHistoryFn: NodejsFunction;
  public readonly updateSubscriptionStatusFn: NodejsFunction;
  public readonly listDevicesFn: NodejsFunction;
  public readonly revokeDeviceFn: NodejsFunction;
  public readonly completeLoginFn: NodejsFunction;
  public readonly getOverviewFn: NodejsFunction;
  public readonly listAuditEventsFn: NodejsFunction;
  public readonly createVaccineShareFn: NodejsFunction;
  public readonly revokeVaccineShareFn: NodejsFunction;
  public readonly getPublicVaccineFn: NodejsFunction;
  public readonly getPublicVaccinePdfFn: NodejsFunction;
  public readonly publicPingFn: NodejsFunction;
  public readonly publicNotFoundFn: NodejsFunction;


  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const { idempotencyTable, usersTable, profilesTable, vaccinesTable, shareInvitesTable, devicesTable, subscriptionsTable, auditEventsTable, vaccineShareLinksTable, userPoolId, userPoolClientId } = props;

    const commonEnv = {
      USERS_TABLE_NAME: usersTable.tableName,
      PROFILES_TABLE_NAME: profilesTable.tableName,
      VACCINES_TABLE_NAME: vaccinesTable.tableName,
      SHARE_INVITES_TABLE_NAME: shareInvitesTable.tableName,
      DEVICES_TABLE_NAME: devicesTable.tableName,
      SUBSCRIPTIONS_TABLE_NAME: subscriptionsTable.tableName,
      AUDIT_EVENTS_TABLE_NAME: auditEventsTable.tableName,
      USER_POOL_ID: userPoolId,
      COGNITO_CLIENT_ID: userPoolClientId,
      VACCINE_SHARE_LINKS_TABLE_NAME: vaccineShareLinksTable.tableName,
      DEVICE_LIMIT_FREE: process.env.DEVICE_LIMIT_FREE || '1',
    };


    // profiles
    this.listProfilesFn = makeFn(this, 'ListProfilesFn', 'profiles/list.ts', commonEnv, idempotencyTable.tableName);
    this.createProfileFn = makeFn(this, 'CreateProfileFn', 'profiles/create.ts', commonEnv, idempotencyTable.tableName);
    this.getProfileFn = makeFn(this, 'GetProfileFn', 'profiles/get.ts', commonEnv, idempotencyTable.tableName);
    this.updateProfileFn = makeFn(this, 'UpdateProfileFn', 'profiles/update.ts', commonEnv, idempotencyTable.tableName);
    this.deleteProfileFn = makeFn(this, 'DeleteProfileFn', 'profiles/delete.ts', commonEnv, idempotencyTable.tableName);

    // vaccines
    this.listVaccinesFn = makeFn(this, 'ListVaccinesFn', 'vaccines/list.ts', commonEnv, idempotencyTable.tableName);
    this.createVaccineFn = makeFn(this, 'CreateVaccineFn', 'vaccines/create.ts', commonEnv, idempotencyTable.tableName);
    this.updateVaccineFn = makeFn(this, 'UpdateVaccineFn', 'vaccines/update.ts', commonEnv, idempotencyTable.tableName);
    this.deleteVaccineFn = makeFn(this, 'DeleteVaccineFn', 'vaccines/delete.ts', commonEnv, idempotencyTable.tableName);
    this.restoreVaccineFn = makeFn(this, 'RestoreVaccineFn', 'vaccines/restore.ts', commonEnv, idempotencyTable.tableName);

    // shares (profile)
    this.createOrUpdateShareFn = makeFn(
      this,
      'CreateOrUpdateShareFn',
      'shares/createOrUpdate.ts',
      commonEnv,
      idempotencyTable.tableName
    );

    this.listProfileSharesFn = makeFn(this, 'ListProfileSharesFn', 'shares/listByProfile.ts', commonEnv, idempotencyTable.tableName);
    this.listReceivedSharesFn = makeFn(
      this,
      'ListReceivedSharesFn',
      'shares/listReceived.ts',
      commonEnv,
      idempotencyTable.tableName
    );
    this.acceptShareFn = makeFn(this, 'AcceptShareFn', 'shares/accept.ts', commonEnv, idempotencyTable.tableName);
    this.deleteShareFn = makeFn(this, 'DeleteShareFn', 'shares/delete.ts', commonEnv, idempotencyTable.tableName);

    // subscriptions
    this.createSubscriptionFn = makeFn(
      this,
      'CreateSubscriptionFn',
      'subscriptions/create.ts',
      commonEnv,
      idempotencyTable.tableName
    );
    this.getSubscriptionFn = makeFn(this, 'GetSubscriptionFn', 'subscriptions/get.ts', commonEnv, idempotencyTable.tableName);
    this.getSubscriptionPlansFn = makeFn(
      this,
      'GetSubscriptionPlansFn',
      'subscriptions/plans.ts',
      commonEnv,
      idempotencyTable.tableName
    );
    this.cancelSubscriptionFn = makeFn(
      this,
      'CancelSubscriptionFn',
      'subscriptions/cancel.ts',
      commonEnv,
      idempotencyTable.tableName
    );
    this.getSubscriptionHistoryFn = makeFn(
      this,
      'GetSubscriptionHistoryFn',
      'subscriptions/history.ts',
      commonEnv,
      idempotencyTable.tableName
    );
    this.updateSubscriptionStatusFn = makeFn(
      this,
      'UpdateSubscriptionStatusFn',
      'subscriptions/updateStatus.ts',
      commonEnv,
      idempotencyTable.tableName
    );

    // devices
    this.listDevicesFn = makeFn(this, 'ListDevicesFn', 'devices/list.ts', commonEnv, idempotencyTable.tableName);
    this.revokeDeviceFn = makeFn(this, 'RevokeDeviceFn', 'devices/revoke.ts', commonEnv, idempotencyTable.tableName);

    // auth finisher + overview
    this.completeLoginFn = makeFn(this, 'CompleteLoginFn', 'auth/complete-login.ts', commonEnv, idempotencyTable.tableName);
    this.getOverviewFn = makeFn(this, 'GetOverviewFn', 'user/overview.ts', commonEnv, idempotencyTable.tableName);

    // FIX: Add a new Lambda function for fetching the audit log.
    this.listAuditEventsFn = makeFn(this, 'ListAuditEventsFn', 'audit/listByProfile.ts', commonEnv, idempotencyTable.tableName);

    // =====================================================
    // NEW: Vaccine single-record share Lambdas
    // =====================================================
    this.createVaccineShareFn = makeFn(
      this,
      'CreateVaccineShareFn',
      'vaccine-share/create.ts',
      commonEnv,
      idempotencyTable.tableName
    );
    this.revokeVaccineShareFn = makeFn(
      this,
      'RevokeVaccineShareFn',
      'vaccine-share/revoke.ts',
      commonEnv,
      idempotencyTable.tableName
    );
    this.getPublicVaccineFn = makeFn(
      this,
      'GetPublicVaccineFn',
      'vaccine-share/getPublic.ts',
      commonEnv,
      idempotencyTable.tableName
    );

    // SPECIAL: PDF lambda — custom NodejsFunction with bundling so .ttf can be imported
    this.getPublicVaccinePdfFn = new NodejsFunction(this, 'GetPublicVaccinePdfFn', {
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
        format: OutputFormat.CJS,
        loader: { '.ttf': 'dataurl' },
      },
    });

    // quick public health-check + catch-all (to keep CORS OK on typos)
    this.publicPingFn = new NodejsFunction(this, 'PublicPingFn', {
      entry: lf('vaccine-share/ping.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {},
    });
    this.publicNotFoundFn = new NodejsFunction(this, 'PublicNotFoundFn', {
      entry: lf('vaccine-share/notFound.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {},
    });
  }
}