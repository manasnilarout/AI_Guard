import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import { config, validateConfig, getServerInfo } from './config';
import { errorHandler } from '../middleware/error-handler';
import { requestLogger } from '../middleware/request-logger';
import { corsMiddleware } from '../middleware/cors';
import { ProxyHandler } from '../proxy/proxy-handler';
import { logger } from '../utils/logger';
import { getSupportedProviders } from '../proxy/provider-config';

// Create Koa app
const app = new Koa();
const router = new Router();

// Create proxy handler
const proxyHandler = new ProxyHandler();

// Health check endpoint
router.get('/health', (ctx) => {
  ctx.body = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ...getServerInfo(),
  };
});

// Ready check endpoint
router.get('/ready', (ctx) => {
  ctx.body = {
    status: 'ready',
    providers: getSupportedProviders(),
    timestamp: new Date().toISOString(),
  };
});

// Main proxy route - catch all
router.all('/(.*)', async (ctx) => {
  await proxyHandler.handleRequest(ctx);
});

// Apply middleware
app.use(errorHandler);
app.use(requestLogger);
app.use(corsMiddleware);

if (config.enableCompression) {
  app.use(compress({
    threshold: 2048,
    gzip: {
      flush: require('zlib').constants.Z_SYNC_FLUSH,
    },
  }));
}

app.use(bodyParser({
  jsonLimit: config.maxRequestSize,
  textLimit: config.maxRequestSize,
  formLimit: config.maxRequestSize,
}));

// Apply routes
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
export function startServer(): void {
  validateConfig();
  
  const server = app.listen(config.port, () => {
    logger.info('AI Guard proxy server started', {
      port: config.port,
      environment: process.env.NODE_ENV || 'development',
      providers: getSupportedProviders(),
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

// Start the server if this is the main module
if (require.main === module) {
  startServer();
}