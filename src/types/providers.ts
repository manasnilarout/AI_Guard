export enum ProviderName {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
}

export interface ProviderConfig {
  name: ProviderName;
  host: string;
  authHeader: string;
  authPrefix?: string; // For "Bearer" prefix in Authorization header
  constantHeaders?: Record<string, string>; // Static headers to always add
  constantQueryParams?: Record<string, string>; // Static query params to always add
}