import { encryptionService } from './encryption';
import { ApiKey } from '../database/models/api-key.model';
import { Project } from '../database/models/project.model';
import { logger } from '../utils/logger';

export interface KeyRotationResult {
  rotatedCount: number;
  failedCount: number;
  errors: Array<{ keyId: string; error: string }>;
}

export class KeyManager {
  /**
   * Rotate encryption keys for all API keys in the database
   */
  public static async rotateAllKeys(
    oldKey: string,
    newKey: string
  ): Promise<KeyRotationResult> {
    const result: KeyRotationResult = {
      rotatedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Rotate keys in ApiKey collection
      const apiKeys = await ApiKey.find({}).exec();
      
      for (const apiKey of apiKeys) {
        try {
          const newEncryptedKey = await encryptionService.rotateEncryption(
            apiKey.encryptedKey,
            Buffer.from(oldKey, 'utf8'),
            Buffer.from(newKey, 'utf8')
          );

          apiKey.encryptedKey = newEncryptedKey;
          await apiKey.save();
          
          result.rotatedCount++;
          logger.info(`Rotated API key: ${apiKey.keyId}`);
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            keyId: apiKey.keyId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          logger.error(`Failed to rotate API key ${apiKey.keyId}:`, error);
        }
      }

      // Rotate keys in Project collection (embedded API keys)
      const projects = await Project.find({}).exec();
      
      for (const project of projects) {
        for (const projectApiKey of project.apiKeys) {
          try {
            const newEncryptedKey = await encryptionService.rotateEncryption(
              projectApiKey.encryptedKey,
              Buffer.from(oldKey, 'utf8'),
              Buffer.from(newKey, 'utf8')
            );

            projectApiKey.encryptedKey = newEncryptedKey;
            result.rotatedCount++;
          } catch (error) {
            result.failedCount++;
            result.errors.push({
              keyId: projectApiKey.keyId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            logger.error(`Failed to rotate project API key ${projectApiKey.keyId}:`, error);
          }
        }
        
        if (project.isModified()) {
          await project.save();
        }
      }

      logger.info('Key rotation completed', result);
      return result;
    } catch (error) {
      logger.error('Key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Validate that all encrypted keys can be decrypted
   */
  public static async validateAllKeys(): Promise<{
    valid: number;
    invalid: number;
    errors: Array<{ keyId: string; error: string }>;
  }> {
    const result = {
      valid: 0,
      invalid: 0,
      errors: [] as Array<{ keyId: string; error: string }>,
    };

    try {
      // Validate keys in ApiKey collection
      const apiKeys = await ApiKey.find({}).exec();
      
      for (const apiKey of apiKeys) {
        try {
          encryptionService.decryptApiKey(apiKey.encryptedKey);
          result.valid++;
        } catch (error) {
          result.invalid++;
          result.errors.push({
            keyId: apiKey.keyId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Validate keys in Project collection
      const projects = await Project.find({}).exec();
      
      for (const project of projects) {
        for (const projectApiKey of project.apiKeys) {
          try {
            encryptionService.decryptApiKey(projectApiKey.encryptedKey);
            result.valid++;
          } catch (error) {
            result.invalid++;
            result.errors.push({
              keyId: projectApiKey.keyId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      logger.info('Key validation completed', result);
      return result;
    } catch (error) {
      logger.error('Key validation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a new encryption key for rotation
   */
  public static generateNewKey(): string {
    return encryptionService.generateEncryptionKey();
  }

  /**
   * Encrypt an API key before storage
   */
  public static encryptApiKey(
    apiKey: string,
    provider: string,
    userId: string
  ): { encryptedKey: string; keyId: string } {
    return encryptionService.encryptApiKey(apiKey, {
      provider,
      userId,
      encryptedAt: new Date().toISOString(),
    });
  }

  /**
   * Decrypt an API key for use
   */
  public static decryptApiKey(encryptedKey: string): string {
    const decrypted = encryptionService.decryptApiKey(encryptedKey);
    return decrypted.key;
  }

  /**
   * Check if an API key is expired based on metadata
   */
  public static isKeyExpired(encryptedKey: string, maxAgeInDays: number = 90): boolean {
    try {
      const decrypted = encryptionService.decryptApiKey(encryptedKey);
      const encryptedAt = new Date(decrypted.encryptedAt);
      const now = new Date();
      const ageInDays = (now.getTime() - encryptedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      return ageInDays > maxAgeInDays;
    } catch (error) {
      logger.error('Failed to check key expiration:', error);
      return true; // Assume expired if we can't decrypt
    }
  }
}