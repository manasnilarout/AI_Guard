import Router from '@koa/router';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { logger } from '../../utils/logger';

const router = new Router();

// Load Swagger specification
let swaggerDocument: any;
try {
  const swaggerPath = path.join(__dirname, '../../../swagger.yaml');
  swaggerDocument = YAML.load(swaggerPath);
  logger.info('Swagger specification loaded successfully');
} catch (error) {
  logger.error('Failed to load Swagger specification:', error);
  swaggerDocument = {
    openapi: '3.0.3',
    info: {
      title: 'AI Guard API',
      version: '2.0.0',
      description: 'API documentation temporarily unavailable'
    },
    paths: {}
  };
}

// Swagger UI options
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    oauth: {
      clientId: 'ai-guard-swagger',
      appName: 'AI Guard API Documentation'
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { background: #fafafa; border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 4px; }
  `,
  customSiteTitle: 'AI Guard API Documentation',
  customfavIcon: '/_api/docs/favicon.ico'
};

// Convert Koa middleware to work with swagger-ui-express
const koaSwagger = (req: any, res: any, next: any) => {
  return swaggerUi.setup(swaggerDocument, swaggerOptions)(req, res, next);
};

// Serve Swagger UI
router.get('/docs', async (ctx) => {
  // Convert Koa context to Express-like request/response
  const req = {
    ...ctx.request,
    url: ctx.url,
    method: ctx.method,
    headers: ctx.headers,
    query: ctx.query,
    params: ctx.params
  };

  const res = {
    ...ctx.response,
    send: (data: any) => {
      ctx.body = data;
    },
    set: (name: string, value: string) => {
      ctx.set(name, value);
    },
    status: (code: number) => {
      ctx.status = code;
      return res;
    },
    json: (data: any) => {
      ctx.body = data;
      ctx.type = 'application/json';
    },
    end: (data?: any) => {
      if (data) ctx.body = data;
    }
  };

  try {
    await new Promise((resolve, reject) => {
      koaSwagger(req, res, (error: any) => {
        if (error) reject(error);
        else resolve(undefined);
      });
    });
  } catch (error) {
    logger.error('Swagger UI error:', error);
    ctx.status = 500;
    ctx.body = 'Error loading API documentation';
  }
});

// Serve Swagger JSON
router.get('/docs/swagger.json', (ctx) => {
  ctx.body = swaggerDocument;
  ctx.type = 'application/json';
});

// Serve Swagger YAML
router.get('/docs/swagger.yaml', (ctx) => {
  ctx.body = YAML.stringify(swaggerDocument, 4);
  ctx.type = 'text/yaml';
});

// API documentation landing page
router.get('/docs/info', (ctx) => {
  ctx.body = {
    title: 'AI Guard API Documentation',
    version: swaggerDocument?.info?.version || '2.0.0',
    description: 'Complete API reference for AI Guard Enterprise AI API Management Platform',
    endpoints: {
      'Swagger UI': '/_api/docs',
      'OpenAPI JSON': '/_api/docs/swagger.json',
      'OpenAPI YAML': '/_api/docs/swagger.yaml'
    },
    authentication: {
      'Firebase Auth': 'Use Firebase ID tokens in Authorization header',
      'Personal Access Tokens': 'Use generated PATs in Authorization header',
      'Admin Key': 'Use X-Admin-Key header for admin endpoints'
    },
    examples: {
      'Create Project': 'POST /_api/projects',
      'Add API Key': 'POST /_api/projects/{id}/keys',
      'OpenAI Proxy': 'POST /v1/chat/completions with X-AI-Guard-Provider: openai',
      'Usage Analytics': 'GET /_api/projects/{id}/usage'
    },
    links: {
      'User Guide': '/USER_GUIDE.md',
      'GitHub Repository': 'https://github.com/your-org/ai-guard',
      'Support': 'support@aiguard.dev'
    }
  };
});

// Simple HTML page for better UX
router.get('/docs/ui', (ctx) => {
  ctx.type = 'text/html';
  ctx.body = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Guard API Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .btn { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .code { background: #f1f3f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ AI Guard API Documentation</h1>
        <p>Enterprise AI API Management Platform - Complete API Reference</p>
    </div>

    <div class="card">
        <h2>📚 Interactive Documentation</h2>
        <p>Explore and test all AI Guard APIs using our interactive Swagger UI interface.</p>
        <a href="/_api/docs" class="btn">Open Swagger UI</a>
    </div>

    <div class="card">
        <h2>🔗 API Specifications</h2>
        <p>Download or view the OpenAPI specification in different formats:</p>
        <a href="/_api/docs/swagger.json" class="btn">JSON Format</a>
        <a href="/_api/docs/swagger.yaml" class="btn">YAML Format</a>
    </div>

    <div class="card">
        <h2>🚀 Quick Start</h2>
        <p>Get started with AI Guard APIs in minutes:</p>
        <ol>
            <li>Authenticate using Firebase or create a Personal Access Token</li>
            <li>Create a project: <span class="code">POST /_api/projects</span></li>
            <li>Add provider API keys: <span class="code">POST /_api/projects/{id}/keys</span></li>
            <li>Start making AI API calls with <span class="code">X-AI-Guard-Provider</span> header</li>
        </ol>
    </div>

    <div class="card">
        <h2>🔐 Authentication</h2>
        <ul>
            <li><strong>Firebase Auth:</strong> Use Firebase ID tokens for user authentication</li>
            <li><strong>Personal Access Tokens:</strong> Generate PATs for server-to-server communication</li>
            <li><strong>Admin Access:</strong> Use X-Admin-Key header for administrative operations</li>
        </ul>
    </div>

    <div class="card">
        <h2>📖 Additional Resources</h2>
        <a href="/USER_GUIDE.md" class="btn">User Guide</a>
        <a href="/README.md" class="btn">Documentation</a>
        <a href="https://github.com/your-org/ai-guard" class="btn">GitHub</a>
    </div>
</body>
</html>
  `;
});

export { router as swaggerRouter };