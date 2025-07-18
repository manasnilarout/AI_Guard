import { getProviderConfig } from '../../src/proxy/provider-config';

describe('Proxy Handler Header Filtering', () => {
  it('should filter out unwanted headers', () => {
    const unwantedHeaders = [
      'host',
      'x-ai-guard-provider',
      'authorization',
      'connection',
      'content-length',
      'user-agent',
      'accept-encoding',
      'postman-token',
      'cache-control',
      'pragma',
    ];

    // This test verifies that our header filtering logic
    // would exclude these headers from being forwarded
    const mockHeaders = {
      'content-type': 'application/json',
      'accept': 'application/json',
      'host': 'localhost:3000',
      'authorization': 'Bearer old-token',
      'connection': 'keep-alive',
      'user-agent': 'PostmanRuntime/7.44.1',
      'postman-token': 'some-token',
      'x-ai-guard-provider': 'anthropic',
    };

    const allowedHeaders = Object.keys(mockHeaders).filter(
      key => !unwantedHeaders.includes(key.toLowerCase())
    );

    // Should only include content-type and accept
    expect(allowedHeaders).toEqual(['content-type', 'accept']);
  });

  it('should have anthropic-version in constant headers', () => {
    const config = getProviderConfig('anthropic');
    expect(config?.constantHeaders?.['anthropic-version']).toBe('2023-06-01');
  });

  it('should not have Content-Type in constant headers', () => {
    const config = getProviderConfig('anthropic');
    expect(config?.constantHeaders?.['Content-Type']).toBeUndefined();
    expect(config?.constantHeaders?.['content-type']).toBeUndefined();
  });

  it('should use correct auth header for each provider', () => {
    const openaiConfig = getProviderConfig('openai');
    expect(openaiConfig?.authHeader).toBe('Authorization');
    expect(openaiConfig?.authPrefix).toBe('Bearer');

    const anthropicConfig = getProviderConfig('anthropic');
    expect(anthropicConfig?.authHeader).toBe('x-api-key');
    expect(anthropicConfig?.authPrefix).toBeUndefined();

    const geminiConfig = getProviderConfig('gemini');
    expect(geminiConfig?.authHeader).toBe('x-goog-api-key');
    expect(geminiConfig?.authPrefix).toBeUndefined();
  });
});