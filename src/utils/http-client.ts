import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from './logger';

const DEFAULT_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY || '1000', 10);

export interface HttpClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class HttpClient {
  private client: AxiosInstance;

  constructor(options: HttpClientOptions = {}) {
    this.client = axios.create({
      timeout: options.timeout || DEFAULT_TIMEOUT,
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on any status
      // Don't add default headers that might interfere
      headers: {
        'User-Agent': 'AI-Guard-Proxy/1.0.0',
      },
    });

    // Configure retry logic
    axiosRetry(this.client, {
      retries: options.maxRetries || MAX_RETRIES,
      retryDelay: (retryCount) => {
        return retryCount * (options.retryDelay || RETRY_DELAY);
      },
      retryCondition: (error) => {
        // Retry on network errors or 5xx errors
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status !== undefined && error.response.status >= 500)
        );
      },
      onRetry: (retryCount, error) => {
        logger.warn('Retrying request', {
          retryCount,
          error: error.message,
          url: error.config?.url,
        });
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Outgoing request', {
          method: config.method,
          url: config.url,
          headers: this.sanitizeHeaders(config.headers),
        });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Incoming response', {
          status: response.status,
          url: response.config.url,
          headers: response.headers,
        });
        return response;
      },
      (error) => {
        logger.error('Response interceptor error', { error: error.message });
        return Promise.reject(error);
      },
    );
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.client.request<T>(config);
    } catch (error) {
      logger.error('HTTP request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: config.url,
        method: config.method,
      });
      throw error;
    }
  }

  async streamRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.request({
      ...config,
      responseType: 'stream',
    });
  }

  private sanitizeHeaders(headers?: Record<string, unknown>): Record<string, unknown> {
    if (!headers) return {};
    
    const sanitized = { ...headers };
    // Remove sensitive headers from logs
    const sensitiveHeaders = ['authorization', 'x-api-key', 'x-goog-api-key'];
    
    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

export const httpClient = new HttpClient();