# AI Guard - Universal AI Proxy Service

AI Guard is a transparent proxy service that forwards requests to multiple AI APIs (OpenAI, Anthropic, Google Gemini) while managing authentication and logging.

## Features

- **Multi-Provider Support**: Route requests to OpenAI, Anthropic, and Google Gemini APIs
- **Transparent Proxying**: Forwards requests as-is, only replacing host and authentication headers
- **Request Logging**: Comprehensive logging of all requests and responses
- **Streaming Support**: Full support for SSE (Server-Sent Events) streaming responses
- **Simple Configuration**: Minimal configuration - just host URL and auth header per provider
- **Health Monitoring**: Built-in health check and readiness endpoints

## Quick Start

### Prerequisites

- Node.js 20+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-guard
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Add your API keys to the `.env` file:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

### Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Usage

### Making Requests

Send requests to the proxy with the target provider specified in the `X-AI-Guard-Provider` header:

```bash
# OpenAI Example
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: openai" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Anthropic Example
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: anthropic" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Gemini Example
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: gemini" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contents": [{"parts": [{"text": "Hello!"}]}]
  }'
```

### Health Checks

```bash
# Health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/ready
```

### Testing

A test script is provided to test all endpoints:

```bash
chmod +x examples/test-proxy.sh
./examples/test-proxy.sh
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -f docker/Dockerfile -t ai-guard .

# Run container
docker run -p 3000:3000 --env-file .env ai-guard
```

## Configuration

Environment variables:

- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (default: info)
- `REQUEST_TIMEOUT`: Request timeout in ms (default: 30000)
- `MAX_RETRIES`: Maximum retry attempts (default: 3)
- `RETRY_DELAY`: Delay between retries in ms (default: 1000)
- `MAX_REQUEST_SIZE`: Maximum request body size (default: 10mb)
- `ENABLE_COMPRESSION`: Enable response compression (default: true)

## Development

### Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build for production
- `npm run test`: Run tests
- `npm run lint`: Run linter
- `npm run format`: Format code
- `npm run typecheck`: Run TypeScript type checking

### How It Works

The proxy:
1. Receives requests with `X-AI-Guard-Provider` header specifying the target provider
2. Looks up the provider's host URL and authentication configuration
3. Forwards the request as-is to the provider's host
4. Only modifies:
   - The `Host` header (set to provider's host)
   - The authentication header (using provider's API key from environment)
   - Adds any constant headers required by the provider (e.g., `anthropic-version: 2023-06-01`)
   - Adds any constant query parameters required by the provider
   - Removes `X-AI-Guard-Provider` header
5. Returns the provider's response unchanged

### Provider-Specific Constants

Each provider can have constant headers and query parameters that are automatically added:

- **OpenAI**: No constant headers/params needed
- **Anthropic**: Automatically adds `anthropic-version: 2023-06-01` header
- **Gemini**: No constant headers/params needed

This allows the proxy to handle provider-specific requirements transparently.

### Adding New Providers

To add a new provider, simply update the `providerConfigs` in `/src/proxy/provider-config.ts`:

```typescript
[ProviderName.NEW_PROVIDER]: {
  name: ProviderName.NEW_PROVIDER,
  host: 'https://api.newprovider.com',
  authHeader: 'X-API-Key',
  authPrefix: 'Bearer', // Optional
  constantHeaders: {
    'Custom-Header': 'value',
    'API-Version': '2024-01-01',
  },
  constantQueryParams: {
    'format': 'json',
    'version': 'v1',
  },
},
```

### Project Structure

```
src/
├── server/          # Server configuration and entry point
├── middleware/      # Koa middleware (error handling, logging, CORS)
├── proxy/           # Core proxy logic and provider configurations
├── utils/           # Utility functions (logger, HTTP client)
└── types/           # TypeScript type definitions
```

## License

ISC