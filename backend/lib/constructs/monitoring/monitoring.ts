
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';

export interface MonitoringProps {
  api: apigateway.HttpApi;
  ocrFunction: lambda.Function;
  webhookFunction: lambda.Function;
}

export class Monitoring extends Construct {
  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    const topic = new sns.Topic(this, 'Topic');

    const email = ssm.StringParameter.valueForStringParameter(
      this,
      '/famvax/monitoring/email'
    );

    topic.addSubscription(new subscriptions.EmailSubscription(email));

    const dashboard = new cloudwatch.Dashboard(this, 'FamVaxDashboard');

    // API Gateway Metrics
    const apiGateway4xxErrorsMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4XXError',
      dimensionsMap: { ApiId: props.api.apiId },
      statistic: 'Sum',
      period: Duration.minutes(5),
    });

    const apiGateway5xxErrorsMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: { ApiId: props.api.apiId },
      statistic: 'Sum',
      period: Duration.minutes(5),
    });

    const apiGatewayLatencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: { ApiId: props.api.apiId },
      statistic: 'Average',
      period: Duration.minutes(5),
    });

    // Alarms
    const highApiGateway4xxErrorsAlarm = new cloudwatch.Alarm(this, 'HighApiGateway4xxErrorsAlarm', {
      metric: apiGateway4xxErrorsMetric,
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    const highApiGateway5xxErrorsAlarm = new cloudwatch.Alarm(this, 'HighApiGateway5xxErrorsAlarm', {
      metric: apiGateway5xxErrorsMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    highApiGateway4xxErrorsAlarm.addAlarmAction(new SnsAction(topic));
    highApiGateway5xxErrorsAlarm.addAlarmAction(new SnsAction(topic));

    // Dashboard Widgets
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Errors',
        left: [apiGateway4xxErrorsMetric, apiGateway5xxErrorsMetric],
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Latency',
        left: [apiGatewayLatencyMetric],
      }),
      new cloudwatch.GraphWidget({
        title: 'OCR Errors',
        left: [new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: { FunctionName: props.ocrFunction.functionName },
          statistic: 'Sum',
          period: Duration.minutes(5),
        })],
      })
    );

    // OCR Alarm
    const ocrErrorsAlarm = new cloudwatch.Alarm(this, 'OcrErrorsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: { FunctionName: props.ocrFunction.functionName },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    ocrErrorsAlarm.addAlarmAction(new SnsAction(topic));

    // Webhook Alarm
    const webhookErrorsAlarm = new cloudwatch.Alarm(this, 'WebhookErrorsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: { FunctionName: props.webhookFunction.functionName },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    webhookErrorsAlarm.addAlarmAction(new SnsAction(topic));

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Webhook Failures',
        left: [new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: { FunctionName: props.webhookFunction.functionName },
          statistic: 'Sum',
          period: Duration.minutes(5),
        })],
      })
    );
  }
}
