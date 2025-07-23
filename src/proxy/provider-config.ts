import { ProviderConfig, ProviderName } from '../types/providers';

export const providerConfigs: Record<ProviderName, ProviderConfig> = {
  [ProviderName.OPENAI]: {
    name: ProviderName.OPENAI,
    host: 'https://api.openai.com',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
  },
  [ProviderName.ANTHROPIC]: {
    name: ProviderName.ANTHROPIC,
    host: 'https://api.anthropic.com',
    authHeader: 'x-api-key',
    constantHeaders: {
      'anthropic-version': '2023-06-01',
    },
  },
  [ProviderName.GEMINI]: {
    name: ProviderName.GEMINI,
    host: 'https://generativelanguage.googleapis.com',
    authHeader: 'x-goog-api-key',
    // For Gemini, API key is typically passed as query parameter
    // but we're handling it in the auth header for consistency
  },
  // For web-ui based testing we'll add a dummy config for the provider
  [ProviderName.WEB_UI]: {
    name: ProviderName.WEB_UI,
    host: 'https://web-ui.com',
    authHeader: 'authorization',
    constantHeaders: {},
  },
};

export function getProviderConfig(providerName: string): ProviderConfig | null {
  const normalizedName = providerName.toLowerCase() as ProviderName;
  return providerConfigs[normalizedName] || null;
}

export function getSupportedProviders(): string[] {
  return Object.keys(providerConfigs);
}