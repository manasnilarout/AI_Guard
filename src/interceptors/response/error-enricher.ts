import { Context, Next } from 'koa';
import { ProxyError, ProxyErrorType } from '../../types/proxy';
import { logger } from '../../utils/logger';

export interface EnrichedError {
  type: string;
  message: string;
  details?: any;
  provider?: string;
  statusCode: number;
  requestId?: string;
  timestamp: string;
  path: string;
  method: string;
  suggestions?: string[];
}

export class ErrorEnricher {
  /**
   * Create error enrichment middleware
   */
  public createMiddleware() {
    return async (ctx: Context, next: Next) => {
      try {
        await next();
      } catch (error) {
        const enrichedError = this.enrichError(error, ctx);
        
        ctx.status = enrichedError.statusCode;
        ctx.body = { error: enrichedError };

        // Log the enriched error
        logger.error('Enriched error response', {
          error: enrichedError,
          originalError: error instanceof Error ? error.message : error,
        });
      }
    };
  }

  /**
   * Enrich error with additional context and suggestions
   */
  private enrichError(error: any, ctx: Context): EnrichedError {
    const baseError: EnrichedError = {
      type: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: ctx.path,
      method: ctx.method,
      provider: ctx.headers['x-ai-guard-provider'] as string,
      requestId: (ctx as any).metadata?.requestId,
    };

    // Handle ProxyError
    if (error instanceof ProxyError) {
      return {
        ...baseError,
        type: error.type,
        message: error.message,
        details: error.details,
        statusCode: error.statusCode,
        suggestions: this.getSuggestionsForProxyError(error),
      };
    }

    // Handle Axios/HTTP errors
    if (error.response) {
      const axiosError = error;
      const providerError = this.enrichProviderError(axiosError, ctx);
      
      return {
        ...baseError,
        type: 'UPSTREAM_ERROR',
        message: providerError.message,
        details: providerError.details,
        statusCode: axiosError.response.status,
        suggestions: providerError.suggestions,
      };
    }

    // Handle network errors
    if (error.request) {
      return {
        ...baseError,
        type: 'NETWORK_ERROR',
        message: 'Failed to connect to AI provider',
        statusCode: 502,
        suggestions: [
          'Check if the AI provider service is available',
          'Verify network connectivity',
          'Try again in a few moments',
        ],
      };
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return {
        ...baseError,
        type: 'VALIDATION_ERROR',
        message: error.message,
        statusCode: 400,
        details: error.details,
        suggestions: [
          'Check the request body format',
          'Ensure all required fields are provided',
          'Verify data types match the expected schema',
        ],
      };
    }

    // Handle MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return {
        ...baseError,
        type: 'DATABASE_ERROR',
        message: 'Database operation failed',
        statusCode: 503,
        suggestions: [
          'Try the request again',
          'Contact support if the issue persists',
        ],
      };
    }

    // Handle authentication errors
    if (error.name === 'UnauthorizedError' || error.message?.includes('unauthorized')) {
      return {
        ...baseError,
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
        statusCode: 401,
        suggestions: [
          'Check your authorization header',
          'Verify your API key or token is valid',
          'Ensure you have the required permissions',
        ],
      };
    }

    // Default error handling
    return {
      ...baseError,
      message: error.message || 'An unexpected error occurred',
      suggestions: [
        'Try the request again',
        'Check the request format',
        'Contact support if the issue persists',
      ],
    };
  }

  /**
   * Enrich provider-specific errors
   */
  private enrichProviderError(axiosError: any, ctx: Context): {
    message: string;
    details?: any;
    suggestions: string[];
  } {
    const provider = ctx.headers['x-ai-guard-provider'] as string;
    const status = axiosError.response.status;
    const responseData = axiosError.response.data;

    // Common suggestions based on status code
    const commonSuggestions = this.getCommonSuggestions(status);

    switch (provider?.toLowerCase()) {
      case 'openai':
        return this.enrichOpenAIError(status, responseData, commonSuggestions);
      
      case 'anthropic':
        return this.enrichAnthropicError(status, responseData, commonSuggestions);
      
      case 'gemini':
        return this.enrichGeminiError(status, responseData, commonSuggestions);
      
      default:
        return {
          message: responseData?.message || `Provider returned ${status} error`,
          details: responseData,
          suggestions: commonSuggestions,
        };
    }
  }

  /**
   * Enrich OpenAI-specific errors
   */
  private enrichOpenAIError(status: number, responseData: any, baseSuggestions: string[]): {
    message: string;
    details?: any;
    suggestions: string[];
  } {
    const error = responseData?.error;
    
    if (!error) {
      return {
        message: `OpenAI API returned ${status} error`,
        details: responseData,
        suggestions: baseSuggestions,
      };
    }

    const suggestions = [...baseSuggestions];

    // Add OpenAI-specific suggestions based on error type
    switch (error.type) {
      case 'invalid_request_error':
        suggestions.unshift('Check your request parameters and format');
        break;
      case 'authentication_error':
        suggestions.unshift('Verify your OpenAI API key is correct and active');
        break;
      case 'permission_error':
        suggestions.unshift('Ensure your API key has access to the requested model');
        break;
      case 'rate_limit_error':
        suggestions.unshift('Reduce request frequency or upgrade your OpenAI plan');
        break;
      case 'server_error':
        suggestions.unshift('OpenAI is experiencing issues, try again later');
        break;
    }

    return {
      message: error.message,
      details: { type: error.type, code: error.code, param: error.param },
      suggestions,
    };
  }

  /**
   * Enrich Anthropic-specific errors
   */
  private enrichAnthropicError(status: number, responseData: any, baseSuggestions: string[]): {
    message: string;
    details?: any;
    suggestions: string[];
  } {
    const error = responseData?.error;
    
    if (!error) {
      return {
        message: `Anthropic API returned ${status} error`,
        details: responseData,
        suggestions: baseSuggestions,
      };
    }

    const suggestions = [...baseSuggestions];

    // Add Anthropic-specific suggestions
    switch (error.type) {
      case 'invalid_request':
        suggestions.unshift('Check your request format and required parameters');
        break;
      case 'authentication_error':
        suggestions.unshift('Verify your Anthropic API key is correct');
        break;
      case 'rate_limit_error':
        suggestions.unshift('Reduce request frequency or contact Anthropic for higher limits');
        break;
      case 'api_error':
        suggestions.unshift('Anthropic API is experiencing issues, try again later');
        break;
    }

    return {
      message: error.message,
      details: { type: error.type },
      suggestions,
    };
  }

  /**
   * Enrich Gemini-specific errors
   */
  private enrichGeminiError(status: number, responseData: any, baseSuggestions: string[]): {
    message: string;
    details?: any;
    suggestions: string[];
  } {
    const error = responseData?.error;
    
    if (!error) {
      return {
        message: `Google Gemini API returned ${status} error`,
        details: responseData,
        suggestions: baseSuggestions,
      };
    }

    const suggestions = [...baseSuggestions];

    // Add Gemini-specific suggestions based on error code
    switch (error.code) {
      case 400:
        suggestions.unshift('Check your request format and ensure all required fields are provided');
        break;
      case 401:
        suggestions.unshift('Verify your Google Cloud API key and authentication');
        break;
      case 403:
        suggestions.unshift('Ensure your API key has Gemini API access enabled');
        break;
      case 429:
        suggestions.unshift('You have exceeded the rate limit, try again later');
        break;
    }

    return {
      message: error.message || `Gemini API error: ${error.status}`,
      details: { 
        code: error.code, 
        status: error.status,
        details: error.details 
      },
      suggestions,
    };
  }

  /**
   * Get common suggestions based on HTTP status code
   */
  private getCommonSuggestions(status: number): string[] {
    switch (status) {
      case 400:
        return ['Check your request format and parameters'];
      case 401:
        return ['Verify your authentication credentials'];
      case 403:
        return ['Check if you have permission to access this resource'];
      case 404:
        return ['Verify the endpoint URL is correct'];
      case 429:
        return ['Wait before making another request', 'Consider reducing request frequency'];
      case 500:
      case 502:
      case 503:
      case 504:
        return ['The service is temporarily unavailable', 'Try again in a few moments'];
      default:
        return ['Check the API documentation for details'];
    }
  }

  /**
   * Get suggestions for ProxyError types
   */
  private getSuggestionsForProxyError(error: ProxyError): string[] {
    switch (error.type) {
      case ProxyErrorType.INVALID_PROVIDER:
        return [
          'Check the X-AI-Guard-Provider header',
          'Ensure the provider name is supported (openai, anthropic, gemini)',
        ];
      
      case ProxyErrorType.CONFIGURATION_ERROR:
        return [
          'Verify API keys are configured for the provider',
          'Check project settings and permissions',
        ];
      
      case ProxyErrorType.AUTHENTICATION_ERROR:
        return [
          'Verify your authorization token',
          'Check if your token has expired',
          'Ensure you have the required permissions',
        ];
      
      case ProxyErrorType.INVALID_REQUEST:
        return [
          'Check the request format',
          'Verify all required parameters are provided',
          'Ensure the request body is valid JSON',
        ];
      
      case ProxyErrorType.NETWORK_ERROR:
        return [
          'Check your network connectivity',
          'Verify the AI provider service is available',
          'Try again in a few moments',
        ];
      
      default:
        return ['Check the request and try again'];
    }
  }
}

export const errorEnricher = new ErrorEnricher();