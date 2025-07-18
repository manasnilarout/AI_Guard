import winston from 'winston';
import { RequestMetadata } from '../types/proxy';

const logLevel = process.env.LOG_LEVEL || 'info';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'ai-guard' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

export function logRequest(metadata: RequestMetadata, status: number, duration: number): void {
  logger.info('Request completed', {
    requestId: metadata.requestId,
    provider: metadata.provider,
    method: metadata.method,
    path: metadata.path,
    status,
    duration,
    clientIp: metadata.clientIp,
  });
}

export function logError(error: Error, metadata?: RequestMetadata): void {
  logger.error('Request error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    metadata,
  });
}

export function logStreamingStart(metadata: RequestMetadata): void {
  logger.debug('Streaming response started', {
    requestId: metadata.requestId,
    provider: metadata.provider,
    path: metadata.path,
  });
}

export function logStreamingEnd(metadata: RequestMetadata, duration: number): void {
  logger.debug('Streaming response completed', {
    requestId: metadata.requestId,
    provider: metadata.provider,
    path: metadata.path,
    duration,
  });
}