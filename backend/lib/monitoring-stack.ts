
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Monitoring, MonitoringProps } from './constructs/monitoring/monitoring';

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & MonitoringProps) {
    super(scope, id, props);

    new Monitoring(this, 'Monitoring', props);
  }
}
