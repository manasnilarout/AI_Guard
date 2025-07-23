import { Context, Next } from 'koa';
import NodeCache from 'node-cache';
import { createHash } from 'crypto';
import { logger } from '../../utils/logger';

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
  excludeStatusCodes: number[];
  excludeProviders: string[];
}

export class ResponseCache {
  private cache: NodeCache;
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enabled: process.env.RESPONSE_CACHE_ENABLED === 'true' || false,
      ttlSeconds: parseInt(process.env.RESPONSE_CACHE_TTL || '300'), // 5 minutes
      maxSize: parseInt(process.env.RESPONSE_CACHE_MAX_SIZE || '1000'),
      excludeStatusCodes: [400, 401, 403, 404, 429, 500, 502, 503, 504],
      excludeProviders: [],
      ...config,
    };

    this.cache = new NodeCache({
      stdTTL: this.config.ttlSeconds,
      maxKeys: this.config.maxSize,
      checkperiod: this.config.ttlSeconds * 0.2,
      useClones: false,
    });

    // Log cache events
    this.cache.on('set', (key, value) => {
      logger.debug('Response cached', { key, size: JSON.stringify(value).length });
    });

    this.cache.on('expired', (key) => {
      logger.debug('Cache entry expired', { key });
    });
  }

  /**
   * Create caching middleware
   */
  public createMiddleware() {
    return async (ctx: Context, next: Next) => {
      if (!this.config.enabled) {
        await next();
        return;
      }

      if (!this.shouldCache(ctx)) {
        await next();
        return;
      }

      const cacheKey = this.generateCacheKey(ctx);
      const cachedResponse = this.cache.get(cacheKey);

      if (cachedResponse) {
        const cached = cachedResponse as {
          status: number;
          headers: Record<string, string>;
          body: any;
          timestamp: number;
        };

        ctx.status = cached.status;
        ctx.body = cached.body;

        // Set cached response headers
        Object.entries(cached.headers).forEach(([key, value]) => {
          ctx.set(key, value);
        });

        // Add cache headers
        ctx.set('X-Cache', 'HIT');
        ctx.set('X-Cache-Key', cacheKey);
        ctx.set('X-Cache-Age', String(Math.floor((Date.now() - cached.timestamp) / 1000)));

        logger.debug('Cache hit', { key: cacheKey, path: ctx.path });
        return;
      }

      // Execute request
      await next();

      // Cache successful responses
      if (this.shouldCacheResponse(ctx)) {
        const responseToCache = {
          status: ctx.status,
          headers: this.getHeadersToCache(ctx),
          body: ctx.body,
          timestamp: Date.now(),
        };

        this.cache.set(cacheKey, responseToCache);
        ctx.set('X-Cache', 'MISS');
        ctx.set('X-Cache-Key', cacheKey);

        logger.debug('Response cached', { key: cacheKey, path: ctx.path, status: ctx.status });
      } else {
        ctx.set('X-Cache', 'SKIP');
      }
    };
  }

  /**
   * Check if request should be cached
   */
  private shouldCache(ctx: Context): boolean {
    // Only cache GET requests
    if (ctx.method !== 'GET') {
      return false;
    }

    // Check provider exclusions
    const provider = ctx.headers['x-ai-guard-provider'] as string;
    if (provider && this.config.excludeProviders.includes(provider.toLowerCase())) {
      return false;
    }

    // Don't cache if user explicitly requests fresh data
    if (ctx.headers['cache-control'] === 'no-cache' || ctx.headers.pragma === 'no-cache') {
      return false;
    }

    return true;
  }

  /**
   * Check if response should be cached
   */
  private shouldCacheResponse(ctx: Context): boolean {
    // Don't cache error responses
    if (this.config.excludeStatusCodes.includes(ctx.status)) {
      return false;
    }

    // Don't cache streaming responses
    if (ctx.get('content-type')?.includes('text/event-stream')) {
      return false;
    }

    // Don't cache very large responses (> 1MB)
    const contentLength = ctx.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return false;
    }

    return true;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(ctx: Context): string {
    const keyData: any = {
      method: ctx.method,
      path: ctx.path,
      query: ctx.querystring,
      provider: ctx.headers['x-ai-guard-provider'],
      body: ctx.method === 'GET' ? undefined : (ctx.request as any).body,
    };

    // Include user/project in cache key for personalized responses
    const auth = ctx.state.auth;
    if (auth) {
      keyData['userId'] = auth.user?._id;
      keyData['projectId'] = auth.project?._id;
    }

    const keyString = JSON.stringify(keyData);
    return createHash('sha256').update(keyString).digest('hex').substring(0, 16);
  }

  /**
   * Get headers that should be cached
   */
  private getHeadersToCache(ctx: Context): Record<string, string> {
    const headersToCache = [
      'content-type',
      'content-encoding',
      'cache-control',
      'expires',
      'etag',
      'last-modified',
    ];

    const headers: Record<string, string> = {};
    
    headersToCache.forEach(headerName => {
      const value = ctx.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });

    return headers;
  }

  /**
   * Clear cache for specific pattern
   */
  public clearCache(pattern?: string): number {
    if (!pattern) {
      const keysBefore = this.cache.keys().length;
      this.cache.flushAll();
      logger.info('Cache cleared completely', { keysBefore });
      return keysBefore;
    }

    const keys = this.cache.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));
    
    keysToDelete.forEach(key => this.cache.del(key));
    
    logger.info('Cache cleared with pattern', { pattern, keysDeleted: keysToDelete.length });
    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const stats = this.cache.getStats();
    const hitRate = stats.hits + stats.misses > 0 
      ? stats.hits / (stats.hits + stats.misses) 
      : 0;

    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Configure cache settings
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update cache TTL if changed
    if (newConfig.ttlSeconds !== undefined) {
      this.cache.options.stdTTL = newConfig.ttlSeconds;
    }

    logger.info('Cache configuration updated', { config: this.config });
  }

  /**
   * Check if caching is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }
}

export const responseCache = new ResponseCache();