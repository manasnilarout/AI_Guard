import { Context, Next } from 'koa';
import { logger } from '../utils/logger';

export async function requestLogger(ctx: Context, next: Next): Promise<void> {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  // Add request ID to context
  ctx.state.requestId = requestId;
  
  logger.info('Incoming request', {
    requestId,
    method: ctx.method,
    url: ctx.url,
    headers: sanitizeHeaders(ctx.headers),
    ip: ctx.ip,
  });

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      requestId,
      method: ctx.method,
      url: ctx.url,
      status: ctx.status,
      duration,
      responseSize: ctx.response.length,
    });
  }
}

function sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
  
  sensitiveHeaders.forEach((header) => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}