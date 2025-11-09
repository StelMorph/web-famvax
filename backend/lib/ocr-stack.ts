import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { HttpApi, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

const lf = (...p: string[]) => path.join(__dirname, '..', 'lambda-fns', ...p);

export class OcrStack extends cdk.Stack {
  public readonly ocrFunction: NodejsFunction;
  public readonly getUploadUrlFn!: NodejsFunction; // <-- Added '!' here

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ocrUploadsBucket = new s3.Bucket(this, 'OcrUploadsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ['http://localhost:5173'],
          allowedHeaders: ['*'],
        },
      ],
    });

    this.getUploadUrlFn = new NodejsFunction(this, 'GetUploadUrlFn', {
      entry: lf('ocr/getUploadUrl.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {
        SCAN_UPLOADS_BUCKET_NAME: ocrUploadsBucket.bucketName,
      },
    });

    const scanDocumentFn = new NodejsFunction(this, 'ScanDocumentFn', {
      entry: lf('ocr/scanDocument.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {
        SCAN_UPLOADS_BUCKET_NAME: ocrUploadsBucket.bucketName,
      },
    });
    this.ocrFunction = scanDocumentFn;

    ocrUploadsBucket.grantPut(this.getUploadUrlFn); // <-- Use this.getUploadUrlFn here
    ocrUploadsBucket.grantRead(scanDocumentFn);

    scanDocumentFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['textract:AnalyzeDocument'],
        resources: ['*'],
      })
    );

    // The ocrApi and its routes are being moved to BackendStack, so they are commented out here.
    // const ocrApi = new HttpApi(this, 'OcrApi', {
    //   corsPreflight: {
    //     allowHeaders: ['*'],
    //     allowMethods: [CorsHttpMethod.ANY],
    //     allowOrigins: ['http://localhost:5173'],
    //     maxAge: Duration.days(1),
    //   },
    // });

    // ocrApi.addRoutes({
    //   path: '/ocr/get-upload-url',
    //   methods: [HttpMethod.POST],
    //   integration: new HttpLambdaIntegration('GetUploadUrlUrlIntegration', getUploadUrlFn),
    // });

    // ocrApi.addRoutes({
    //   path: '/ocr/scan-document',
    //   methods: [HttpMethod.POST],
    //   integration: new HttpLambdaIntegration('ScanDocumentIntegration', scanDocumentFn),
    // });

    // new cdk.CfnOutput(this, 'OcrApiUrl', { value: ocrApi.url! });
  }
}
