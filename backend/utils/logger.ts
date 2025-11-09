import pino from 'pino';
import { randomUUID } from 'crypto';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    log: (obj: Record<string, any>) => {
      return {
        ...obj,
        correlationId: obj.correlationId || randomUUID(),
      };
    },
  },
});

export default logger;
