# Universal AI Proxy Service Design Document

## Objective

To build a secure and transparent proxy service that intermediates requests to multiple AI APIs such as OpenAI, Anthropic, Google Gemini, and others. The service will:

- Replace the base URL and authentication header
- Forward all other request details unchanged
- Manage user and token authentication via MongoDB and Firebase

## Use Cases

- Centralized control over AI API access
- Token authentication and user management
- Simplified AI API integration for internal clients
- Support for multiple AI service providers

---

## Key Features

### 1. Transparent Proxying

- **Request Forwarding**: Maintain the exact request body, query parameters, and headers except for:
  - `Authorization`: replaced with a server-managed API key specific to the target provider
  - `Host`: set to the target provider's API endpoint (e.g., `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`)
- **Provider Selection**: Use the `X-AI-Guard-Provider` header to determine the target provider
- **Response Handling**: Relay responses from AI providers back to the client unchanged

### 2. Authentication

- Support OAuth2 Bearer Tokens or PAT (Personal Access Tokens)
- Extract user identity from tokens for access control

---

## Architecture Overview

### Components

1. **Koa Web Server**: Handles incoming HTTP requests
2. **Middleware**:
   - Auth verification
3. **Proxy Layer**: Forwards requests to appropriate AI provider
4. **Provider Config**: Maps headers to target provider configurations
5. **MongoDB Backend**: Stores user, project, and PAT token metadata

### MongoDB Integration

- **Collections**:
  - `users`: User profile info (e.g., Firebase UID, email, signup date)
  - `tokens`: PATs mapped to users and scopes
  - `projects`: Project metadata with associated users/tokens

- **Essential Data Capturing**:
  - Log user signups and PAT generations in sync with Firebase
  - Associate tokens with projects and users

---

## Request Lifecycle

1. Client sends request to `https://proxy.yourdomain.com/v1/chat/completions` (pure URL)
2. Proxy verifies and identifies user via token
3. Proxy determines the target provider based on `X-AI-Guard-Provider` header
4. Proxy constructs equivalent request:
   - URL: Target provider's endpoint
   - Headers: updated `Authorization`
5. Sends request to provider
6. Receives response
7. Returns response to client

---

## Sample Implementation (Koa.js)

```javascript
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');

const app = new Koa();
const router = new Router();
const mongoClient = new MongoClient(process.env.MONGO_URI);

const providerConfigs = {
  openai: {
    baseUrl: 'https://api.openai.com',
    getApiKey: getOpenAIKeyForUser,
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    getApiKey: getAnthropicKeyForUser,
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    getApiKey: getGeminiKeyForUser,
  },
};

router.all('/(.*)', async (ctx) => {
  const user = await authenticateUser(ctx);
  const provider = ctx.headers['x-ai-guard-provider'];
  const config = providerConfigs[provider];
  if (!config) ctx.throw(400, 'Unsupported or missing provider');

  const apiKey = config.getApiKey(user);
  const proxiedUrl = `${config.baseUrl}/${ctx.params[0]}`;

  const headers = {
    ...ctx.headers,
    host: new URL(config.baseUrl).host,
    authorization: `Bearer ${apiKey}`,
  };
  delete headers['x-ai-guard-provider'];

  const response = await fetch(proxiedUrl, {
    method: ctx.method,
    headers,
    body: ['GET', 'HEAD'].includes(ctx.method) ? undefined : JSON.stringify(ctx.request.body),
  });

  const responseBody = await response.text();
  ctx.status = response.status;
  ctx.set(response.headers.raw());
  ctx.body = responseBody;
});

app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());
app.listen(3000);
```

---

## Edge Case Handling

- **Streaming**: Forward chunks unaltered
- **File Uploads**: Support multipart form-data
- **Errors**: Do not mask provider errors; relay to client
- **Rate Limits**: Log headers like `x-ratelimit-*`

---

## Optional Enhancements

- Admin dashboard for user and project management
- Token revocation and audit trails
- Support for multiple API keys per user or tenant per provider

---

## Security Considerations

- TLS for transport encryption
- Strict validation and sanitization of incoming requests
- Audit logging of sensitive operations

---

## Conclusion

This universal AI proxy service allows seamless and secure routing of API calls to various AI providers (e.g., OpenAI, Anthropic, Gemini) while enabling centralized authentication via user and PAT token management. It simplifies AI API consumption across different systems using a unified, pure URL structure and provider selection via headers. With MongoDB integration, it maintains persistent records of user activity, tokens, and project assignments needed for access control and service tracking.

