import { Context } from 'koa';
import { AuditLog } from '../database/models/audit-log.model';
import { logger } from '../utils/logger';

export interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  status: 'success' | 'failure';
  errorMessage?: string;
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async log(ctx: Context, data: AuditLogData): Promise<void> {
    try {
      const auditLog = new AuditLog({
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details,
        ipAddress: ctx.ip,
        userAgent: ctx.headers['user-agent'] || 'Unknown',
        status: data.status,
        errorMessage: data.errorMessage,
      });

      await auditLog.save();
    } catch (error) {
      logger.error('Failed to save audit log:', error);
    }
  }

  /**
   * Create audit middleware
   */
  static createMiddleware() {
    return async (ctx: Context, next: any) => {
      const auth = ctx.state.auth;
      if (!auth?.user) {
        await next();
        return;
      }

      const startTime = Date.now();
      let error: Error | null = null;

      try {
        await next();
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        // Log the API call
        const duration = Date.now() - startTime;
        
        await AuditService.log(ctx, {
          userId: auth.user._id.toString(),
          action: `api.${ctx.method.toLowerCase()}`,
          resource: ctx.path,
          details: {
            method: ctx.method,
            path: ctx.path,
            query: ctx.querystring,
            duration,
            statusCode: ctx.status,
          },
          status: error ? 'failure' : 'success',
          errorMessage: error?.message,
        });
      }
    };
  }
}

export const auditService = AuditService;