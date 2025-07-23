# AI Guard - Enterprise AI API Management Platform

AI Guard is a comprehensive, enterprise-grade API management platform that provides secure, monitored, and scalable access to multiple AI providers (OpenAI, Anthropic, Google Gemini) with advanced features like multi-tenancy, authentication, rate limiting, usage tracking, and audit logging.

## 🚀 Features

### Core Capabilities
- **🔀 Multi-Provider Support**: Unified interface for OpenAI, Anthropic, and Google Gemini APIs
- **🛡️ Enterprise Security**: AES-256-GCM encryption, role-based access control, audit logging
- **🏢 Multi-Tenancy**: Project-based organization with team collaboration
- **⚡ Intelligent Routing**: Dynamic API key resolution with fallback strategies
- **📊 Real-time Analytics**: Usage tracking, cost monitoring, and performance metrics

### Advanced Features
- **🔐 Dual Authentication**: Firebase integration + Personal Access Tokens (PAT)
- **⏱️ Rate Limiting**: Configurable limits with Redis backend support
- **📈 Quota Management**: Daily/monthly usage limits with overrides
- **💾 Response Caching**: Configurable caching with pattern-based invalidation
- **🔍 Request Validation**: Provider-specific schema validation with security checks
- **📝 Comprehensive Logging**: Detailed audit trails for compliance and debugging

### Management APIs
- **👥 User Management**: Profile management, token lifecycle, usage summaries
- **🏗️ Project Management**: Team collaboration, API key management, member roles
- **⚙️ Admin Dashboard**: System health, user management, analytics, cache control

## 📋 Prerequisites

- **Node.js** 20+
- **MongoDB** (local or cloud)
- **Redis** (optional, for enhanced rate limiting)
- **Firebase Project** (for authentication)

## 🚀 Quick Start

### 1. Installation

```bash
git clone <repository-url>
cd ai-guard
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Configure your `.env` file with required settings:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ai_guard
MONGODB_DB_NAME=ai_guard

# Firebase Authentication  
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-key

# Optional: Redis for enhanced rate limiting
REDIS_URL=redis://localhost:6379

# Admin Access
ADMIN_SECRET_KEY=your-admin-secret-key
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

Server starts at `http://localhost:3000`

## 📖 Usage

### Authentication Setup

1. **Create Firebase Account & Get Token**
2. **Create Project via API**
3. **Add Provider API Keys**
4. **Start Making Requests**

### Basic API Calls

```bash
# OpenAI Example
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-AI-Guard-Provider: openai" \
  -H "Authorization: Bearer <your-firebase-token>" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

For detailed usage instructions, see the **[User Guide](USER_GUIDE.md)**

## 🏗️ Architecture

### Request Flow

```
Client → Authentication → Rate Limiting → Quota Check → 
Validation → Key Resolution → Provider API → Response Processing → 
Usage Tracking → Audit Logging → Client Response
```

### Project Structure

```
src/
├── api/                 # Management API controllers and routes
│   ├── controllers/     # User, Project, Admin controllers
│   └── routes/          # API route definitions
├── auth/                # Authentication system
│   ├── pat/            # Personal Access Token system
│   ├── firebase-admin.ts
│   └── auth-middleware.ts
├── database/           # MongoDB integration
│   ├── models/         # Mongoose schemas
│   └── repositories/   # Data access layer
├── interceptors/       # Request/response middleware
│   ├── request/        # Rate limiting, quotas, validation
│   └── response/       # Usage tracking, caching, error handling
├── proxy/              # Core proxy functionality
├── security/           # Encryption and key management
├── services/           # Business logic services
└── utils/              # Shared utilities
```

## 🔧 API Reference

### Management APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /_api/projects` | Create new project |
| `GET /_api/projects/:id` | Get project details |
| `POST /_api/projects/:id/keys` | Add provider API keys |
| `POST /_api/users/tokens` | Create Personal Access Token |
| `GET /_api/projects/:id/usage` | Get usage statistics |
| `GET /_api/admin/system/health` | System health check |

### Proxy Endpoints

All provider endpoints are available at their respective paths with the `X-AI-Guard-Provider` header:

- **OpenAI**: `/v1/*` with `X-AI-Guard-Provider: openai`
- **Anthropic**: `/v1/*` with `X-AI-Guard-Provider: anthropic`  
- **Gemini**: `/v1beta/*` with `X-AI-Guard-Provider: gemini`

## 📊 Monitoring & Analytics

### Usage Tracking
- **Real-time metrics**: Requests, tokens, costs per provider
- **Project-level analytics**: Usage breakdowns and trends
- **Cost monitoring**: Automatic cost calculation per provider

### System Health
- **Health endpoints**: `/health`, `/ready`, `/api/health`
- **Admin dashboard**: System metrics, user stats, performance
- **Audit logging**: Comprehensive activity tracking

## 🔒 Security Features

### Data Protection
- **Encryption at Rest**: All API keys encrypted with AES-256-GCM
- **Key Rotation**: Built-in support for rotating API keys
- **Secure Headers**: Automatic header filtering and security validation

### Access Control
- **Role-based Access**: Owner, Admin, Member roles per project
- **Scoped Tokens**: Granular permissions for Personal Access Tokens
- **Audit Trails**: Complete logging of all user actions

## 🐳 Docker Support

```bash
# Build and run with Docker
docker build -f docker/Dockerfile -t ai-guard .
docker run -p 3000:3000 --env-file .env ai-guard

# Or use Docker Compose (includes MongoDB and Redis)
docker-compose up -d
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Integration tests
npm run test:integration

# Test all providers
chmod +x examples/test-proxy.sh
./examples/test-proxy.sh
```

## 📚 Documentation

- **[User Guide](USER_GUIDE.md)**: Comprehensive usage instructions
- **[Phase 2 Implementation](phase-2-s1.md)**: Technical implementation details
- **[API Documentation](API_DOCS.md)**: Complete API reference (coming soon)

## 🔄 Migration from Phase 1

If upgrading from the basic proxy version:

1. Update environment variables with new required fields
2. Database will be automatically initialized on first run
3. Create user accounts and projects via the management APIs
4. Migrate API keys from environment variables to project configuration
5. Update client code to include authentication headers

## 🛠️ Development

### Scripts

```bash
npm run dev          # Development server with hot reload
npm run build        # Build for production  
npm run test         # Run test suite
npm run lint         # Code linting
npm run typecheck    # TypeScript validation
npm run format       # Code formatting
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📈 Roadmap

### Phase 3 (Planned)
- **Advanced Analytics Dashboard**: Web UI for monitoring and management
- **Webhook Support**: Real-time notifications for events
- **Custom Models**: Support for fine-tuned and custom models
- **Load Balancing**: Multiple API key rotation and failover
- **Plugin System**: Extensible middleware architecture

## 🤝 Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Check the User Guide and implementation docs
- **Community**: Join our discussions for help and feature requests

## 📄 License

ISC License - see LICENSE file for details

## 🙏 Acknowledgments

Built with modern technologies:
- **Node.js & TypeScript** for robust server-side development
- **Koa.js** for lightweight, composable middleware
- **MongoDB** for flexible document storage
- **Redis** for high-performance caching and rate limiting
- **Firebase Admin SDK** for enterprise authentication

---

**AI Guard** - Secure, Scalable, Enterprise-Ready AI API Management