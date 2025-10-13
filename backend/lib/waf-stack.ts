// lib/waf-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export class WafStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    console.log('Creating WAF in us-east-1...');

    const webAcl = new wafv2.CfnWebACL(this, 'WebFamVaxWebAcl', {
      name: 'WebFamVaxWebAcl',
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WebFamVaxWebAclMetric',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 0,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRuleMetric',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWS-ManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSCommonRulesMetric',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWS-ManagedRulesBotControlRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesBotControlRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSBotControlMetric',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // This output is the only thing we need.
    new cdk.CfnOutput(this, 'WafAclArn', {
      value: webAcl.attrArn,
      description: 'The ARN of the WAF WebACL for CloudFront.',
    });
  }
}
