
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export class TablesConstruct extends Construct {
  public readonly idempotencyTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly profilesTable: dynamodb.Table;
  public readonly vaccinesTable: dynamodb.Table;
  public readonly shareInvitesTable: dynamodb.Table;
  public readonly devicesTable: dynamodb.Table;
  public readonly subscriptionsTable: dynamodb.Table;
  public readonly auditEventsTable: dynamodb.Table;
  public readonly vaccineShareLinksTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.idempotencyTable = new dynamodb.Table(this, 'IdempotencyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.profilesTable = new dynamodb.Table(this, 'ProfilesTable', {
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.profilesTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    this.vaccinesTable = new dynamodb.Table(this, 'VaccinesTable', {
      partitionKey: { name: 'vaccineId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.vaccinesTable.addGlobalSecondaryIndex({
      indexName: 'profileId-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
    });

    this.shareInvitesTable = new dynamodb.Table(this, 'ShareInvitesTable', {
      partitionKey: { name: 'shareId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.shareInvitesTable.addGlobalSecondaryIndex({
      indexName: 'inviteeEmail-index',
      partitionKey: { name: 'inviteeEmail', type: dynamodb.AttributeType.STRING },
    });
    this.shareInvitesTable.addGlobalSecondaryIndex({
      indexName: 'profileId-inviteeId-index',
      partitionKey: { name: 'profileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'inviteeId', type: dynamodb.AttributeType.STRING },
    });

    this.devicesTable = new dynamodb.Table(this, 'DevicesTable', {
      partitionKey: { name: 'deviceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.devicesTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    this.subscriptionsTable = new dynamodb.Table(this, 'SubscriptionsTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.auditEventsTable = new dynamodb.Table(this, 'AuditEventsTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ts', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.auditEventsTable.addGlobalSecondaryIndex({
      indexName: 'resource-ts-index',
      partitionKey: { name: 'resource', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ts', type: dynamodb.AttributeType.NUMBER },
    });

    this.vaccineShareLinksTable = new dynamodb.Table(this, 'VaccineShareLinksTable', {
      partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expiresAtEpoch',
    });
    this.vaccineShareLinksTable.addGlobalSecondaryIndex({
      indexName: 'vaccineId-index',
      partitionKey: { name: 'vaccineId', type: dynamodb.AttributeType.STRING },
    });
  }
}