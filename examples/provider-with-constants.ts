// Example: Adding a provider that requires constant headers and query parameters
// This file demonstrates how to extend the proxy for a hypothetical provider

import { ProviderConfig, ProviderName } from '../src/types/providers';

// Example provider that requires:
// - API key in X-API-Key header
// - Constant version header
// - Constant format query parameter
export const exampleProviderConfig: ProviderConfig = {
  name: 'example' as ProviderName,
  host: 'https://api.example.com',
  authHeader: 'X-API-Key',
  constantHeaders: {
    'API-Version': '2024-01-01',
    'Accept': 'application/json',
  },
  constantQueryParams: {
    'format': 'json',
    'version': 'v1',
  },
};

// Example request transformation:
// Original request: GET /v1/completions?model=gpt-3.5-turbo
// With X-AI-Guard-Provider: example
// 
// Transformed request:
// GET https://api.example.com/v1/completions?model=gpt-3.5-turbo&format=json&version=v1
// Headers:
//   Host: api.example.com
//   X-API-Key: your-api-key
//   API-Version: 2024-01-01
//   Accept: application/json
//   ... (other original headers except X-AI-Guard-Provider)

/*
To add this provider:
1. Add 'example' to ProviderName enum in types/providers.ts
2. Add the config to providerConfigs in proxy/provider-config.ts
3. Add EXAMPLE_API_KEY to environment variables
4. Update the getApiKey method in proxy-handler.ts
*/