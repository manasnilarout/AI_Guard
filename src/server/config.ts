import dotenv from 'dotenv';
import { ProxyConfig } from '../types/proxy';

// Load environment variables
dotenv.config();

export const config: ProxyConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  enableCompression: process.env.ENABLE_COMPRESSION === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export function validateConfig(): void {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GEMINI_API_KEY',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Some providers may not work without their API keys.');
  }
}

export function getServerInfo(): Record<string, unknown> {
  return {
    name: 'AI Guard Proxy',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    providers: ['openai', 'anthropic', 'gemini'],
  };
}