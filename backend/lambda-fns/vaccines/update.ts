import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, CORS_HEADERS } from '../common/clients';
import { checkPermissions } from '../common/auth';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  try {
    const userId = event.requestContext.authorizer?.jwt.claims.sub;
    const userEmail = event.requestContext.authorizer?.jwt.claims.email;
    const { vaccineId } = event.pathParameters || {};
    const data = JSON.parse(event.body || '{}');

    if (!vaccineId || !userId || !userEmail) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing required parameters.' }),
      };
    }

    const vaccineResult = await docClient.send(
      new GetCommand({
        TableName: process.env.VACCINES_TABLE_NAME!,
        Key: { vaccineId },
      }),
    );
    const profileId = vaccineResult.Item?.profileId;
    if (!profileId) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Vaccine record not found.' }),
      };
    }

    const canEdit = await checkPermissions(userId, userEmail, profileId, 'Editor');
    if (!canEdit) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Forbidden: You do not have permission to edit this record.',
        }),
      };
    }

    const command = new UpdateCommand({
      TableName: process.env.VACCINES_TABLE_NAME!,
      Key: { vaccineId },
      UpdateExpression:
        'set #name = :name, #date = :date, #dose = :dose, #nextDueDate = :nextDueDate, #vaccineType = :vaccineType, #lot = :lot, #clinic = :clinic, #notes = :notes, #sideEffects = :sideEffects',
      ExpressionAttributeNames: {
        '#name': 'vaccineName',
        '#date': 'date',
        '#dose': 'dose',
        '#nextDueDate': 'nextDueDate',
        '#vaccineType': 'vaccineType',
        '#lot': 'lot',
        '#clinic': 'clinic',
        '#notes': 'notes',
        '#sideEffects': 'sideEffects',
      },
      ExpressionAttributeValues: {
        ':name': data.vaccineName,
        ':date': data.date,
        ':dose': data.dose,
        ':nextDueDate': data.nextDueDate,
        ':vaccineType': data.vaccineType,
        ':lot': data.lot,
        ':clinic': data.clinic,
        ':notes': data.notes,
        ':sideEffects': data.sideEffects,
      },
      ReturnValues: 'ALL_NEW',
    });
    const { Attributes } = await docClient.send(command);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(Attributes),
    };
  } catch (error: any) {
    console.error('Error updating vaccine:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
      }),
    };
  }
};
