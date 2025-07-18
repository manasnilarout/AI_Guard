import { getProviderConfig, getSupportedProviders } from '../../src/proxy/provider-config';
import { ProviderName } from '../../src/types/providers';

describe('Provider Configuration Tests', () => {
  describe('getProviderConfig', () => {
    it('should load OpenAI configuration', () => {
      const config = getProviderConfig('openai');
      expect(config).toBeDefined();
      expect(config?.name).toBe(ProviderName.OPENAI);
      expect(config?.host).toBe('https://api.openai.com');
      expect(config?.authHeader).toBe('Authorization');
      expect(config?.authPrefix).toBe('Bearer');
      expect(config?.constantHeaders).toBeUndefined();
      expect(config?.constantQueryParams).toBeUndefined();
    });

    it('should load Anthropic configuration', () => {
      const config = getProviderConfig('anthropic');
      expect(config).toBeDefined();
      expect(config?.name).toBe(ProviderName.ANTHROPIC);
      expect(config?.host).toBe('https://api.anthropic.com');
      expect(config?.authHeader).toBe('x-api-key');
      expect(config?.authPrefix).toBeUndefined();
      expect(config?.constantHeaders).toEqual({
        'anthropic-version': '2023-06-01',
      });
    });

    it('should load Gemini configuration', () => {
      const config = getProviderConfig('gemini');
      expect(config).toBeDefined();
      expect(config?.name).toBe(ProviderName.GEMINI);
      expect(config?.host).toBe('https://generativelanguage.googleapis.com');
      expect(config?.authHeader).toBe('x-goog-api-key');
      expect(config?.authPrefix).toBeUndefined();
      expect(config?.constantHeaders).toBeUndefined();
      expect(config?.constantQueryParams).toBeUndefined();
    });

    it('should return null for invalid provider', () => {
      const config = getProviderConfig('invalid');
      expect(config).toBeNull();
    });

    it('should handle case-insensitive provider names', () => {
      const config = getProviderConfig('OPENAI');
      expect(config).toBeDefined();
      expect(config?.name).toBe(ProviderName.OPENAI);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return all supported providers', () => {
      const providers = getSupportedProviders();
      expect(providers).toEqual(['openai', 'anthropic', 'gemini']);
    });
  });

  describe('Provider-specific Constants', () => {
    it('should have anthropic-version header for Anthropic', () => {
      const config = getProviderConfig('anthropic');
      expect(config?.constantHeaders?.['anthropic-version']).toBe('2023-06-01');
    });

    it('should not have constant headers for OpenAI', () => {
      const config = getProviderConfig('openai');
      expect(config?.constantHeaders).toBeUndefined();
    });

    it('should not have constant headers for Gemini', () => {
      const config = getProviderConfig('gemini');
      expect(config?.constantHeaders).toBeUndefined();
    });
  });
});