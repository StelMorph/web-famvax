#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from backend/.env (needed for SES_FROM_*)
dotenv.config({ path: path.join(__dirname, '../.env') });

import { BackendStack } from '../lib/backend-stack';
import { OcrStack } from '../lib/ocr-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const ocrStack = new OcrStack(app, 'OcrStack', { env });

const backendStack = new BackendStack(app, 'FamVaxBackendStack', {
  env,
  ocrFunction: ocrStack.ocrFunction,
  getUploadUrlFn: ocrStack.getUploadUrlFn,
});

new MonitoringStack(app, 'MonitoringStack', {
  env,
  api: backendStack.api,
  ocrFunction: ocrStack.ocrFunction,
  webhookFunction: backendStack.webhookFunction,
});
