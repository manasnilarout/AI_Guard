import { Context, Next } from 'koa';
import Joi from 'joi';
import { ProxyError, ProxyErrorType } from '../../types/proxy';
import { logger } from '../../utils/logger';

export interface ValidationRule {
  path: string;
  method: string;
  schema: Joi.Schema;
}

export class RequestValidator {
  private validationRules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Initialize provider-specific validation rules
   */
  private initializeValidationRules(): void {
    // OpenAI validation rules
    this.addValidationRule('openai', {
      path: '/v1/chat/completions',
      method: 'POST',
      schema: Joi.object({
        model: Joi.string().required(),
        messages: Joi.array().items(
          Joi.object({
            role: Joi.string().valid('system', 'user', 'assistant', 'function', 'tool').required(),
            content: Joi.alternatives().try(
              Joi.string(),
              Joi.array().items(Joi.object())
            ),
            name: Joi.string().optional(),
          })
        ).required(),
        max_tokens: Joi.number().integer().min(1).max(4096).optional(),
        temperature: Joi.number().min(0).max(2).optional(),
        top_p: Joi.number().min(0).max(1).optional(),
        stream: Joi.boolean().optional(),
        functions: Joi.array().optional(),
        function_call: Joi.alternatives().try(
          Joi.string(),
          Joi.object()
        ).optional(),
        tools: Joi.array().optional(),
        tool_choice: Joi.alternatives().try(
          Joi.string(),
          Joi.object()
        ).optional(),
      }),
    });

    // Anthropic validation rules
    this.addValidationRule('anthropic', {
      path: '/v1/messages',
      method: 'POST',
      schema: Joi.object({
        model: Joi.string().required(),
        messages: Joi.array().items(
          Joi.object({
            role: Joi.string().valid('user', 'assistant').required(),
            content: Joi.alternatives().try(
              Joi.string(),
              Joi.array().items(Joi.object())
            ).required(),
          })
        ).required(),
        max_tokens: Joi.number().integer().min(1).max(4096).required(),
        temperature: Joi.number().min(0).max(1).optional(),
        top_p: Joi.number().min(0).max(1).optional(),
        top_k: Joi.number().integer().min(0).optional(),
        stream: Joi.boolean().optional(),
        system: Joi.string().optional(),
      }),
    });

    // Gemini validation rules
    this.addValidationRule('gemini', {
      path: '/v1beta/models/:model/generateContent',
      method: 'POST',
      schema: Joi.object({
        contents: Joi.array().items(
          Joi.object({
            parts: Joi.array().items(
              Joi.object({
                text: Joi.string().optional(),
                inlineData: Joi.object().optional(),
                fileData: Joi.object().optional(),
                functionCall: Joi.object().optional(),
                functionResponse: Joi.object().optional(),
              })
            ).required(),
            role: Joi.string().valid('user', 'model').optional(),
          })
        ).required(),
        tools: Joi.array().optional(),
        safetySettings: Joi.array().optional(),
        generationConfig: Joi.object({
          temperature: Joi.number().min(0).max(1).optional(),
          topP: Joi.number().min(0).max(1).optional(),
          topK: Joi.number().integer().min(1).optional(),
          candidateCount: Joi.number().integer().min(1).max(8).optional(),
          maxOutputTokens: Joi.number().integer().min(1).max(8192).optional(),
        }).optional(),
      }),
    });
  }

  /**
   * Add validation rule for a provider
   */
  private addValidationRule(provider: string, rule: ValidationRule): void {
    if (!this.validationRules.has(provider)) {
      this.validationRules.set(provider, []);
    }
    this.validationRules.get(provider)!.push(rule);
  }

  /**
   * Create validation middleware
   */
  public createMiddleware() {
    return async (ctx: Context, next: Next) => {
      const provider = ctx.headers['x-ai-guard-provider'] as string;
      
      if (!provider) {
        await next();
        return;
      }

      const rules = this.validationRules.get(provider.toLowerCase());
      if (!rules) {
        await next();
        return;
      }

      // Find matching rule
      const rule = this.findMatchingRule(rules, ctx.path, ctx.method);
      if (!rule) {
        await next();
        return;
      }

      try {
        await this.validateRequest(ctx, rule);
        await next();
      } catch (error) {
        if (error instanceof ProxyError) {
          throw error;
        }
        
        logger.error('Request validation failed:', error);
        throw new ProxyError(
          ProxyErrorType.INVALID_REQUEST,
          400,
          'Request validation failed',
          error
        );
      }
    };
  }

  /**
   * Find matching validation rule
   */
  private findMatchingRule(
    rules: ValidationRule[],
    path: string,
    method: string
  ): ValidationRule | null {
    for (const rule of rules) {
      if (rule.method.toLowerCase() === method.toLowerCase()) {
        if (this.pathMatches(rule.path, path)) {
          return rule;
        }
      }
    }
    return null;
  }

  /**
   * Check if path matches rule (supports simple patterns like :param)
   */
  private pathMatches(rulePath: string, requestPath: string): boolean {
    if (rulePath === requestPath) {
      return true;
    }

    // Handle path parameters (simple implementation)
    const ruleSegments = rulePath.split('/');
    const pathSegments = requestPath.split('/');

    if (ruleSegments.length !== pathSegments.length) {
      return false;
    }

    for (let i = 0; i < ruleSegments.length; i++) {
      const ruleSegment = ruleSegments[i];
      const pathSegment = pathSegments[i];

      if (ruleSegment.startsWith(':')) {
        // Parameter segment, skip validation
        continue;
      }

      if (ruleSegment !== pathSegment) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate request against schema
   */
  private async validateRequest(ctx: Context, rule: ValidationRule): Promise<void> {
    const body = (ctx.request as any).body;

    if (!body && rule.method.toLowerCase() === 'post') {
      throw new ProxyError(
        ProxyErrorType.INVALID_REQUEST,
        400,
        'Request body is required'
      );
    }

    if (body) {
      const { error } = rule.schema.validate(body, {
        abortEarly: false,
        stripUnknown: false,
        allowUnknown: true, // Allow additional fields for forward compatibility
      });

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        throw new ProxyError(
          ProxyErrorType.INVALID_REQUEST,
          400,
          'Request validation failed',
          { validationErrors: details }
        );
      }

      // Optional: Replace request body with validated/sanitized version
      // (ctx.request as any).body = value;
    }
  }

  /**
   * Add custom validation rule
   */
  public addCustomRule(provider: string, rule: ValidationRule): void {
    this.addValidationRule(provider, rule);
    logger.info('Added custom validation rule', { provider, path: rule.path, method: rule.method });
  }

  /**
   * Validate specific fields for security
   */
  private validateSecurityConstraints(body: any): void {
    // Check for potentially dangerous patterns
    const jsonStr = JSON.stringify(body);
    
    // Prevent extremely large requests
    if (jsonStr.length > 1024 * 1024) { // 1MB limit
      throw new ProxyError(
        ProxyErrorType.INVALID_REQUEST,
        413,
        'Request payload too large'
      );
    }

    // Check for SQL injection patterns (basic)
    const sqlPatterns = [
      /\b(union|select|insert|update|delete|drop|create|alter)\b/i,
      /[;'"].*(-{2}|\/\*|\*\/)/,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(jsonStr)) {
        logger.warn('Potential SQL injection attempt detected', { body });
        throw new ProxyError(
          ProxyErrorType.INVALID_REQUEST,
          400,
          'Invalid request content detected'
        );
      }
    }

    // Check for script injection patterns
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(jsonStr)) {
        logger.warn('Potential XSS attempt detected', { body });
        throw new ProxyError(
          ProxyErrorType.INVALID_REQUEST,
          400,
          'Invalid request content detected'
        );
      }
    }
  }

  /**
   * Create security validation middleware (runs before schema validation)
   */
  public createSecurityMiddleware() {
    return async (ctx: Context, next: Next) => {
      try {
        const body = (ctx.request as any).body;
        if (body) {
          this.validateSecurityConstraints(body);
        }
        await next();
      } catch (error) {
        if (error instanceof ProxyError) {
          throw error;
        }
        
        logger.error('Security validation failed:', error);
        throw new ProxyError(
          ProxyErrorType.INVALID_REQUEST,
          400,
          'Security validation failed'
        );
      }
    };
  }
}

export const requestValidator = new RequestValidator();