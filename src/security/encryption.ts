import crypto from 'crypto';
import { logger } from '../utils/logger';

export class EncryptionService {
  private static instance: EncryptionService;
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private tagLength = 16; // 128 bits

  private constructor() {}

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Derive an encryption key from a password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Get the master encryption key from environment
   */
  private getMasterKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    // Ensure key is proper length
    const keyBuffer = Buffer.from(key, 'utf8');
    if (keyBuffer.length < this.keyLength) {
      // Derive a proper key from the provided key
      const salt = Buffer.from('ai-guard-static-salt', 'utf8');
      return this.deriveKey(key, salt);
    }

    return keyBuffer.subarray(0, this.keyLength);
  }

  /**
   * Encrypt a string value
   */
  public encrypt(plaintext: string): string {
    try {
      const masterKey = this.getMasterKey();
      
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, masterKey, iv) as crypto.CipherGCM;
      
      // Encrypt the data
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      
      // Get the authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine IV + tag + encrypted data
      const combined = Buffer.concat([iv, tag, encrypted]);
      
      // Return base64 encoded
      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string value
   */
  public decrypt(encryptedData: string): string {
    try {
      const masterKey = this.getMasterKey();
      
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const iv = combined.subarray(0, this.ivLength);
      const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.subarray(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, masterKey, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);
      
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt an API key with additional metadata
   */
  public encryptApiKey(apiKey: string, metadata?: Record<string, any>): {
    encryptedKey: string;
    keyId: string;
  } {
    const keyId = crypto.randomBytes(16).toString('hex');
    
    // Combine API key with metadata
    const dataToEncrypt = JSON.stringify({
      key: apiKey,
      keyId,
      metadata,
      encryptedAt: new Date().toISOString(),
    });
    
    const encryptedKey = this.encrypt(dataToEncrypt);
    
    return {
      encryptedKey,
      keyId,
    };
  }

  /**
   * Decrypt an API key and return with metadata
   */
  public decryptApiKey(encryptedKey: string): {
    key: string;
    keyId: string;
    metadata?: Record<string, any>;
    encryptedAt: string;
  } {
    const decrypted = this.decrypt(encryptedKey);
    const data = JSON.parse(decrypted);
    
    return {
      key: data.key,
      keyId: data.keyId,
      metadata: data.metadata,
      encryptedAt: data.encryptedAt,
    };
  }

  /**
   * Generate a new encryption key (for key rotation)
   */
  public generateEncryptionKey(): string {
    return crypto.randomBytes(this.keyLength).toString('base64');
  }

  /**
   * Re-encrypt data with a new key (for key rotation)
   */
  public async rotateEncryption(
    encryptedData: string,
    oldKey: Buffer,
    newKey: Buffer
  ): Promise<string> {
    // Temporarily use old key to decrypt
    const originalKey = this.getMasterKey();
    process.env.ENCRYPTION_KEY = oldKey.toString('utf8');
    
    try {
      const decrypted = this.decrypt(encryptedData);
      
      // Use new key to encrypt
      process.env.ENCRYPTION_KEY = newKey.toString('utf8');
      return this.encrypt(decrypted);
    } finally {
      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey.toString('utf8');
    }
  }

  /**
   * Hash a value using SHA-256 (for non-reversible hashing)
   */
  public hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Compare a value with a hash
   */
  public compareHash(value: string, hash: string): boolean {
    const valueHash = this.hash(value);
    return crypto.timingSafeEqual(
      Buffer.from(valueHash),
      Buffer.from(hash)
    );
  }
}

export const encryptionService = EncryptionService.getInstance();