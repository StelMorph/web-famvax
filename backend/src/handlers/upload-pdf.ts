import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!BUCKET_NAME) {
      console.error('UPLOAD_BUCKET_NAME environment variable is not set.');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Server configuration error.' }),
      };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.startsWith('application/pdf')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid Content-Type. Only application/pdf is allowed.' }),
      };
    }

    const body = event.body;
    if (!body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is empty.' }),
      };
    }

    const isBase64Encoded = event.isBase64Encoded || false;
    const fileBuffer = isBase64Encoded ? Buffer.from(body, 'base64') : Buffer.from(body);

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return {
        statusCode: 413,
        body: JSON.stringify({ message: 'File size exceeds the 5MB limit.' }),
      };
    }

    const fileId = uuidv4();
    const key = `uploads/${fileId}.pdf`;

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: 'application/pdf',
    });

    await s3Client.send(putCommand);

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // URL valid for 1 hour

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'File uploaded successfully', fileKey: key, signedUrl }),
    };
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to upload PDF.', error: error.message }),
    };
  }
};
