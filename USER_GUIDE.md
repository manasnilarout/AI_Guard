# AI Guard - User Guide

AI Guard is an enterprise-grade API management platform that provides secure, monitored access to multiple AI providers (OpenAI, Anthropic, Google Gemini) with advanced features like multi-tenancy, rate limiting, usage tracking, and audit logging.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Project Management](#project-management)
4. [API Key Management](#api-key-management)
5. [Making API Calls](#making-api-calls)
6. [Personal Access Tokens](#personal-access-tokens)
7. [Usage Monitoring](#usage-monitoring)
8. [Admin Features](#admin-features)
9. [API Reference](#api-reference)

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB database
- Redis (optional, for enhanced rate limiting)
- Firebase project (for user authentication)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd ai-guard
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Required environment variables:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/ai_guard
MONGODB_DB_NAME=ai_guard

# Firebase Authentication
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret

# Optional: Redis for enhanced rate limiting
REDIS_URL=redis://localhost:6379

# Admin access
ADMIN_SECRET_KEY=your-admin-secret-key
```

4. **Start the server:**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The server will start on `http://localhost:3000`

## Authentication

AI Guard supports two authentication methods:

### 1. Firebase Authentication

For web applications with user accounts:

```javascript
// Frontend: Authenticate with Firebase
import { auth } from 'firebase/auth';
const user = await signInWithEmailAndPassword(auth, email, password);
const token = await user.getIdToken();

// Use token in API calls
const response = await fetch('http://localhost:3000/_api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 2. Personal Access Tokens (PAT)

For server-to-server communication or CI/CD:

```bash
# Create a PAT via API (requires Firebase auth first)
curl -X POST http://localhost:3000/_api/users/tokens \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Token",
    "scopes": ["api:read", "api:write", "projects:read"],
    "expiresInDays": 90
  }'
```

## Application Sequence Flow

### Initial Setup Sequence

1. **User Registration/Authentication**
   ```
   User → Firebase Auth → AI Guard receives Firebase token
   ```

2. **User Profile Creation**
   ```
   First API call → AI Guard creates user record in MongoDB
   ```

3. **Project Creation**
   ```
   POST /api/projects → Creates project with user as owner
   ```

4. **API Key Configuration**
   ```
   POST /api/projects/:id/keys → Add provider API keys (encrypted)
   ```

5. **Ready for Proxy Calls**
   ```
   Proxy requests → AI Guard resolves keys and forwards to providers
   ```

### Runtime Request Sequence

```
1. Client Request
   ↓
2. Authentication Middleware (Firebase/PAT validation)
   ↓
3. Rate Limiting Check
   ↓
4. Quota Validation
   ↓
5. Request Validation (schema, security)
   ↓
6. API Key Resolution (Project → User → System)
   ↓
7. Provider Request
   ↓
8. Response Processing
   ↓
9. Usage Tracking & Audit Logging
   ↓
10. Response to Client
```

## Project Management

### Creating a Project

```bash
curl -X POST http://localhost:3000/_api/projects \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My AI Project"
  }'
```

### Adding Team Members

```bash
curl -X POST http://localhost:3000/_api/projects/:projectId/members \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teammate@example.com",
    "role": "admin"
  }'
```

Roles available:
- **owner**: Full control (automatically assigned to creator)
- **admin**: Manage project, members, and API keys
- **member**: View project and make API calls

## API Key Management

### Adding Provider API Keys

```bash
# Add OpenAI API Key
curl -X POST http://localhost:3000/_api/projects/:projectId/keys \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "apiKey": "sk-...",
    "name": "OpenAI Production Key"
  }'

# Add Anthropic API Key
curl -X POST http://localhost:3000/_api/projects/:projectId/keys \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "name": "Claude API Key"
  }'

# Add Gemini API Key
curl -X POST http://localhost:3000/_api/projects/:projectId/keys \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "apiKey": "AIza...",
    "name": "Gemini Pro Key"
  }'
```

**Security Note**: API keys are encrypted using AES-256-GCM before storage and are never returned in plain text after creation.

### Viewing API Keys

```bash
curl -X GET http://localhost:3000/_api/projects/:projectId/keys \
  -H "Authorization: Bearer <your-token>"

# Response shows masked keys for security
{
  "keys": [
    {
      "keyId": "abc123",
      "provider": "openai",
      "maskedKey": "sk-**********",
      "isActive": true,
      "addedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Making API Calls

Once your project has API keys configured, you can make proxy calls to AI providers:

### OpenAI Example

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: openai" \
  -H "Authorization: Bearer <your-firebase-token-or-pat>" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "max_tokens": 150
  }'
```

### Anthropic Example

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: anthropic" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 150,
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
```

### Gemini Example

```bash
curl -X POST http://localhost:3000/v1beta/models/gemini-pro/generateContent \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: gemini" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "contents": [
      {
        "parts": [
          {"text": "Hello, how are you?"}
        ]
      }
    ]
  }'
```

### JavaScript/Node.js Example

```javascript
const response = await fetch('http://localhost:3000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-AI-Guard-Provider': 'openai',
    'Authorization': `Bearer ${firebaseToken}`
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
    max_tokens: 150
  })
});

const data = await response.json();
console.log(data);
```

### Python Example

```python
import requests

response = requests.post(
    'http://localhost:3000/v1/chat/completions',
    headers={
        'Content-Type': 'application/json',
        'X-AI-Guard-Provider': 'openai',
        'Authorization': f'Bearer {firebase_token}'
    },
    json={
        'model': 'gpt-4',
        'messages': [
            {'role': 'user', 'content': 'Hello!'}
        ],
        'max_tokens': 150
    }
)

print(response.json())
```

## Personal Access Tokens

### Creating PATs

```bash
curl -X POST http://localhost:3000/_api/users/tokens \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Token",
    "scopes": ["api:read", "api:write", "projects:read"],
    "projectId": "optional-project-id",
    "expiresInDays": 90
  }'
```

### Available Scopes

- **api:read**: Make read-only API calls
- **api:write**: Make read/write API calls  
- **projects:read**: View project information
- **projects:write**: Manage projects and settings
- **users:read**: View user profile
- **users:write**: Update user profile
- **admin**: Full administrative access

### Token Rotation

```bash
curl -X POST http://localhost:3000/_api/users/tokens/:tokenId/rotate \
  -H "Authorization: Bearer <your-token>"
```

### Revoking Tokens

```bash
curl -X DELETE http://localhost:3000/_api/users/tokens/:tokenId \
  -H "Authorization: Bearer <your-token>"
```

## Usage Monitoring

### Checking Project Usage

```bash
curl -X GET http://localhost:3000/_api/projects/:projectId/usage \
  -H "Authorization: Bearer <your-token>"

# Response includes usage statistics
{
  "projectId": "...",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "totalRequests": 1500,
  "totalTokens": 45000,
  "totalCost": 12.50,
  "byProvider": {
    "openai": {
      "requests": 1000,
      "tokens": 30000,
      "cost": 9.00
    },
    "anthropic": {
      "requests": 500,
      "tokens": 15000,
      "cost": 3.50
    }
  }
}
```

### Quota Status

```bash
curl -X GET http://localhost:3000/_api/projects/:projectId/quota \
  -H "Authorization: Bearer <your-token>"

# Response shows current quota usage
{
  "projectId": "...",
  "monthlyUsage": 1500,
  "monthlyLimit": 10000,
  "monthlyRemaining": 8500,
  "dailyUsage": 50,
  "dailyLimit": 500,
  "dailyRemaining": 450
}
```

### Rate Limit Headers

AI Guard includes rate limit information in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1640995200
```

## Admin Features

### System Health

```bash
curl -X GET http://localhost:3000/_api/admin/system/health \
  -H "X-Admin-Key: <admin-secret-key>"

# Response includes system status
{
  "status": "healthy",
  "database": {
    "connected": true
  },
  "cache": {
    "keys": 150,
    "hitRate": 0.85
  },
  "uptime": 86400,
  "memory": {
    "used": 128000000,
    "total": 512000000
  }
}
```

### User Management

```bash
# List all users
curl -X GET http://localhost:3000/_api/admin/users \
  -H "X-Admin-Key: <admin-secret-key>"

# Update user status
curl -X PUT http://localhost:3000/_api/admin/users/:userId \
  -H "X-Admin-Key: <admin-secret-key>" \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended"}'
```

### Audit Logs

```bash
curl -X GET http://localhost:3000/_api/admin/audit \
  -H "X-Admin-Key: <admin-secret-key>"
```

## API Reference

### Base URLs
- **API Management**: `http://localhost:3000/api`
- **AI Proxy**: `http://localhost:3000` (with provider endpoints)

### Authentication Headers
- **Firebase**: `Authorization: Bearer <firebase-id-token>`
- **Personal Access Token**: `Authorization: Bearer <pat-token>`
- **Admin**: `X-Admin-Key: <admin-secret-key>`

### Required Headers for Proxy Calls
- `X-AI-Guard-Provider: openai|anthropic|gemini`
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

### Error Response Format

```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Invalid or expired token",
    "statusCode": 401,
    "timestamp": "2024-01-01T00:00:00Z",
    "path": "/api/users/profile",
    "method": "GET",
    "requestId": "req_123456789",
    "suggestions": [
      "Check your authorization header",
      "Verify your API key or token is valid"
    ]
  }
}
```

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/ready

# API health check  
curl http://localhost:3000/_api/health
```

## Best Practices

### Security
- **Rotate API keys regularly** using the rotation endpoints
- **Use project-specific keys** rather than system defaults
- **Implement proper scoping** for Personal Access Tokens
- **Monitor audit logs** for suspicious activity

### Performance
- **Use caching** when appropriate (enabled by default)
- **Monitor rate limits** to avoid throttling
- **Set appropriate quotas** for different user tiers

### Monitoring  
- **Track usage patterns** via the analytics endpoints
- **Set up alerts** for quota and rate limit breaches
- **Review audit logs** regularly for compliance

### Development
- **Use PATs for CI/CD** instead of Firebase tokens
- **Test with different providers** to ensure compatibility
- **Implement proper error handling** for rate limits and quotas

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify Firebase configuration
   - Check token expiration
   - Ensure proper scopes for PATs

2. **Rate Limited**
   - Check current usage with `/quota` endpoint
   - Consider upgrading tier or adjusting limits
   - Implement exponential backoff

3. **API Key Not Found**
   - Verify project has keys configured
   - Check key is active and not expired
   - Ensure user has access to project

4. **Provider Errors**
   - Check provider-specific error messages
   - Verify API key is valid with provider
   - Review provider documentation for endpoint changes

### Getting Help

- Check the logs at `/api/admin/audit` for detailed error information
- Review system health at `/api/admin/system/health`
- Consult the error suggestions in API responses
- Enable debug logging by setting `LOG_LEVEL=debug`

## Migration from Phase 1

If upgrading from Phase 1 (simple proxy):

1. **Update environment variables** with new required fields
2. **Run database migrations** (automatic on startup)
3. **Create user accounts** and projects
4. **Migrate API keys** from environment to project configuration
5. **Update client code** to include authentication headers

The service maintains backward compatibility for basic proxy functionality while adding the new management features.