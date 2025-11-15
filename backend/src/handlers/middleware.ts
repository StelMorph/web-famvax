import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

type LambdaHandler = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<APIGatewayProxyResultV2>;

export const withLogging = (handler: LambdaHandler) => {
  return async (event: APIGatewayProxyEventV2, context: Context) => {
    const correlationId = event.headers?.['x-correlation-id'] || randomUUID();
    logger.info({ correlationId, event }, 'Incoming request');

    try {
      const result = await handler(event, context);
      logger.info({ correlationId, result }, 'Request successful');
      return result;
    } catch (error) {
      logger.error({ correlationId, error }, 'Request failed');
      throw error;
    }
  };
};
