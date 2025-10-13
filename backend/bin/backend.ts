#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from backend/.env (needed for SES_FROM_*)
dotenv.config({ path: path.join(__dirname, '../.env') });

import { BackendStack } from '../lib/backend-stack'; // make sure this file exists (singular)

const app = new cdk.App();

new BackendStack(app, 'FamVaxBackendStack', {
  // <-- THE FIX: Use a consistent, descriptive name
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
