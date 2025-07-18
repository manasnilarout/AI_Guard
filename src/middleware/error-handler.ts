import { Context, Next } from 'koa';
import { logger } from '../utils/logger';
import { ProxyError, ProxyErrorType } from '../types/proxy';

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (error) {
    const err = error as Error;
    
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      url: ctx.url,
      method: ctx.method,
    });

    if (err instanceof ProxyError) {
      ctx.status = err.statusCode;
      ctx.body = {
        error: {
          type: err.type,
          message: err.message,
          details: err.details,
        },
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        error: {
          type: ProxyErrorType.UPSTREAM_ERROR,
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        },
      };
    }
  }
}