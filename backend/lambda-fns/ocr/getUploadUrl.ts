// lambda-fns/ocr/getUploadUrl.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.SCAN_UPLOADS_BUCKET_NAME;
const UPLOAD_EXPIRATION_SECONDS = 300; // URL is valid for 5 minutes

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json',
};

/**
 * Generates a presigned S3 URL for uploading a document.
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!BUCKET_NAME) {
    console.error('BUCKET_NAME environment variable is not set.');
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: 'Server configuration error.' }),
    };
  }

  try {
    // FIX: Cast requestContext to 'any' to access the authorizer property
    // This object is added by the API Gateway JWT authorizer at runtime.
    const userId = (event.requestContext as any).authorizer?.jwt.claims.sub;
    if (!userId || typeof userId !== 'string') {
      return {
        statusCode: 401,
        headers: responseHeaders,
        body: JSON.stringify({ message: 'Unauthorized: User identifier not found.' }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({ message: 'Bad Request: Missing request body.' }),
      };
    }
    const { contentType } = JSON.parse(event.body);
    if (!contentType || typeof contentType !== 'string') {
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({ message: 'Bad Request: "contentType" is required.' }),
      };
    }

    const fileExtension = contentType.split('/')[1] || 'jpg';
    const key = `uploads/${userId}/${randomUUID()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_EXPIRATION_SECONDS,
    });

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        url,
        key,
      }),
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: 'Failed to generate upload URL.', error: (error as Error).message }),
    };
  }
};