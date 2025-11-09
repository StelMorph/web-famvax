// backend/lib/lambda-baseline.ts
import * as cdk from 'aws-cdk-lib';
import { Size } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Architecture, Tracing, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Stack } from 'aws-cdk-lib';
import * as path from 'path';


export function createLambdaFactory(stack: Stack, idempotencyTableName: string) {
  const dlq = new sqs.Queue(stack, 'LambdaDLQ', {
    retentionPeriod: cdk.Duration.days(14),
  });

  const base: Partial<NodejsFunctionProps> = {
    // MODIFIED: Changed to NODEJS_20_X for consistency with backend-stack.ts
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    memorySize: 512,
    timeout: cdk.Duration.seconds(10),
    ephemeralStorageSize: Size.mebibytes(512),
    tracing: Tracing.ACTIVE,
    deadLetterQueueEnabled: true,
    deadLetterQueue: dlq,
    bundling: {
      minify: true,
      sourceMap: true,
      sourceMapMode: SourceMapMode.INLINE,
      target: 'node20', // MODIFIED: Changed bundling target to node20
      // externalModules property should be managed to include Powertools, etc.
      // This comment block is for clarity on what was 'fixed' previously:
      // // --- THE FIX: This property is removed to ensure Powertools are bundled ---
      // // externalModules: [ ... ],
      // // ----------------------------------------------------------------------
    },
    environment: {
      NODE_OPTIONS: '--enable-source-maps',
      POWERTOOLS_SERVICE_NAME: 'FamVaxAPI',
      POWERTOOLS_LOG_LEVEL: 'INFO',
      IDEMPOTENCY_TABLE_NAME: idempotencyTableName,
    },
  };

  return (
    id: string,
    entry: string,
    env: Record<string, string>,
    overrides: Partial<NodejsFunctionProps> = {},
  ) => {
    const logGroup = new logs.LogGroup(stack, `${id}LogGroup`, {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    logGroup.addMetricFilter(`${id}ErrorMetricFilter`, {
      filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Error', 'error'),
      metricName: 'LambdaErrorCount',
      metricNamespace: 'FamVax/Application',
      metricValue: '1',
    });

    const fn = new NodejsFunction(stack, id, {
      ...base,
      entry: path.join(__dirname, `../lambda-fns/${entry}`),
      handler: 'handler',
      environment: { ...base.environment, ...env },
      logGroup: logGroup,
      ...overrides,
    });

    // The idempotencyTable.grantReadWriteData(fn) is now done explicitly in backend-stack.ts
    // but the following line is generally good practice if there's no explicit grant elsewhere.
    // However, for idempotency specifically, the direct grant in backend-stack.ts is more robust.
    // const idempotencyTable = Table.fromTableName(stack, `${id}IdempotencyTable`, idempotencyTableName);
    // idempotencyTable.grantReadWriteData(fn);

    return fn;
  };
}
