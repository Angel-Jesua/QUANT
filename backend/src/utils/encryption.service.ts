import crypto from 'crypto';
import {
  KeyValidationError,
  EncryptionError,
  DecryptionError,
  generateCorrelationId,
} from './encryption.errors';
import {
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  KEY_LENGTH,
  PBKDF2_ITERATIONS,
} from '../config/encryption.config';

/**
 * Audit log entry for cryptographic operations.
 * Never contains plaintext, ciphertext, or keys.
 */
export interface CryptoAuditLog {
  timestamp: Date;
  operation: 'encrypt' | 'decrypt' | 'key_rotation';
  model?: string;
  fieldName?: string;
  success: boolean;
  correlationId?: string;
  errorType?: string;
}

/**
 * Audit logger interface for crypto operations.
 * Implementations can log to console, file, or external service.
 */
export interface CryptoAuditLogger {
  log(entry: CryptoAuditLog): void;
}

/**
 * Default console-based audit logger.
 * Logs crypto operations without exposing sensitive data.
 */
export class ConsoleCryptoAuditLogger implements CryptoAuditLogger {
  log(entry: CryptoAuditLog): void {
    const logMessage = {
      timestamp: entry.timestamp.toISOString(),
      operation: entry.operation,
      ...(entry.model && { model: entry.model }),
      ...(entry.fieldName && { fieldName: entry.fieldName }),
      success: entry.success,
      ...(entry.correlationId && { correlationId: entry.correlationId }),
      ...(entry.errorType && { errorType: entry.errorType }),
    };
    
    if (entry.success) {
      console.log('[CRYPTO_AUDIT]', JSON.stringify(logMessage));
    } else {
      console.error('[CRYPTO_AUDIT]', JSON.stringify(logMessage));
    }
  }
}

/**
 * No-op audit logger for testing or when logging is disabled.
 */
export class NoOpCryptoAuditLogger implements CryptoAuditLogger {
  log(_entry: CryptoAuditLog): void {
    // Intentionally empty - no logging
  }
}

/**
 * AES-256-GCM Encryption Service
 * 
 * Provides centralized encryption/decryption operations following
 * ISO/IEC 18033-3 (block ciphers) and ISO/IEC 19772 (authenticated encryption).
 * 
 * Output format: base64(IV || AuthTag || Ciphertext)
 * - IV: 12 bytes (96 bits)
 * - AuthTag: 16 bytes (128 bits)
 * - Ciphertext: Variable length
 */
export class EncryptionService {
  private readonly key: Buffer;
  private static readonly ALGORITHM = 'aes-256-gcm';
  private readonly auditLogger: CryptoAuditLogger;
  
  /**
   * Prefix used to identify encrypted values.
   * This helps detect if a value is already encrypted.
   */
  private static readonly ENCRYPTED_PREFIX = 'enc:';

  constructor(encryptionKey?: string, auditLogger?: CryptoAuditLogger) {
    const key = encryptionKey ?? process.env.ENCRYPTION_KEY;
    this.validateKey(key);
    this.key = Buffer.from(key!, 'hex');
    this.auditLogger = auditLogger ?? new NoOpCryptoAuditLogger();
  }

  /**
   * Creates an audit log entry for a crypto operation.
   * Never includes plaintext, ciphertext, or key data.
   */
  private logAudit(
    operation: CryptoAuditLog['operation'],
    success: boolean,
    options?: {
      model?: string;
      fieldName?: string;
      correlationId?: string;
      errorType?: string;
    }
  ): void {
    this.auditLogger.log({
      timestamp: new Date(),
      operation,
      success,
      ...options,
    });
  }

  /**
   * Validates that the encryption key meets requirements:
   * - Must be present
   * - Must be exactly 64 hexadecimal characters (32 bytes)
   * - Must contain only valid hex characters
   * 
   * @throws KeyValidationError if key is invalid
   */
  validateKey(key: string | undefined): void {
    if (!key || key.length === 0) {
      throw new KeyValidationError('MISSING');
    }

    if (key.length !== KEY_LENGTH * 2) {
      throw new KeyValidationError('INVALID_LENGTH');
    }

    if (!/^[0-9a-fA-F]+$/.test(key)) {
      throw new KeyValidationError('INVALID_FORMAT');
    }
  }


  /**
   * Encrypts plaintext using AES-256-GCM.
   * 
   * Each encryption generates a unique 12-byte IV using crypto.randomBytes(),
   * ensuring the same plaintext produces different ciphertext each time.
   * 
   * @param plaintext - The string to encrypt
   * @param fieldName - Optional field name for error context
   * @param model - Optional model name for audit logging
   * @returns Encrypted string in format: enc:base64(IV || AuthTag || Ciphertext)
   * @throws EncryptionError if encryption fails
   */
  encrypt(plaintext: string, fieldName?: string, model?: string): string {
    const correlationId = generateCorrelationId();
    
    try {
      // Generate unique IV for each encryption (12 bytes for GCM)
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher with AES-256-GCM
      const cipher = crypto.createCipheriv(
        EncryptionService.ALGORITHM,
        this.key,
        iv
      );
      
      // Encrypt the plaintext
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      
      // Get the authentication tag (16 bytes)
      const authTag = cipher.getAuthTag();
      
      // Combine: IV || AuthTag || Ciphertext
      const combined = Buffer.concat([iv, authTag, encrypted]);
      
      // Log successful encryption (never log plaintext or ciphertext)
      this.logAudit('encrypt', true, { fieldName, model, correlationId });
      
      // Return with prefix for identification
      return EncryptionService.ENCRYPTED_PREFIX + combined.toString('base64');
    } catch (error) {
      // Log failed encryption with error type (never log plaintext)
      const encryptionError = new EncryptionError('encrypt', fieldName, correlationId);
      this.logAudit('encrypt', false, {
        fieldName,
        model,
        correlationId,
        errorType: 'EncryptionError',
      });
      
      // Never expose plaintext in error messages
      throw encryptionError;
    }
  }

  /**
   * Decrypts ciphertext that was encrypted with this service.
   * 
   * Parses the base64 encoded data, extracts IV, AuthTag, and ciphertext,
   * then decrypts and verifies authenticity.
   * 
   * @param ciphertext - The encrypted string (with enc: prefix)
   * @param fieldName - Optional field name for error context
   * @param model - Optional model name for audit logging
   * @returns Decrypted plaintext string
   * @throws DecryptionError if decryption fails
   */
  decrypt(ciphertext: string, fieldName?: string, model?: string): string {
    const correlationId = generateCorrelationId();
    
    try {
      // Remove prefix if present
      const data = ciphertext.startsWith(EncryptionService.ENCRYPTED_PREFIX)
        ? ciphertext.slice(EncryptionService.ENCRYPTED_PREFIX.length)
        : ciphertext;
      
      // Decode from base64
      let combined: Buffer;
      try {
        combined = Buffer.from(data, 'base64');
      } catch {
        const formatError = new DecryptionError('FORMAT_INVALID', fieldName, correlationId);
        this.logAudit('decrypt', false, {
          fieldName,
          model,
          correlationId,
          errorType: 'FORMAT_INVALID',
        });
        throw formatError;
      }
      
      // Minimum length: IV (12) + AuthTag (16) + at least 0 bytes ciphertext
      const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
      if (combined.length < minLength) {
        const formatError = new DecryptionError('FORMAT_INVALID', fieldName, correlationId);
        this.logAudit('decrypt', false, {
          fieldName,
          model,
          correlationId,
          errorType: 'FORMAT_INVALID',
        });
        throw formatError;
      }
      
      // Extract components
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        EncryptionService.ALGORITHM,
        this.key,
        iv
      );
      
      // Set auth tag for verification
      decipher.setAuthTag(authTag);
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      
      // Log successful decryption (never log plaintext or ciphertext)
      this.logAudit('decrypt', true, { fieldName, model, correlationId });
      
      return decrypted.toString('utf8');
    } catch (error) {
      // Check if it's already a DecryptionError (already logged)
      if (error instanceof DecryptionError) {
        throw error;
      }
      
      // GCM authentication failure - data may have been tampered
      const authError = new DecryptionError('AUTH_TAG_MISMATCH', fieldName, correlationId);
      this.logAudit('decrypt', false, {
        fieldName,
        model,
        correlationId,
        errorType: 'AUTH_TAG_MISMATCH',
      });
      
      throw authError;
    }
  }


  /**
   * Checks if a value appears to be encrypted by this service.
   * 
   * Detection is based on:
   * 1. Presence of the enc: prefix
   * 2. Valid base64 encoding
   * 3. Minimum length for IV + AuthTag
   * 
   * @param value - The value to check
   * @returns true if the value appears to be encrypted
   */
  isEncrypted(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    // Check for prefix
    if (!value.startsWith(EncryptionService.ENCRYPTED_PREFIX)) {
      return false;
    }
    
    try {
      const data = value.slice(EncryptionService.ENCRYPTED_PREFIX.length);
      const decoded = Buffer.from(data, 'base64');
      
      // Must have at least IV + AuthTag
      return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH;
    } catch {
      return false;
    }
  }

  /**
   * Salt length in bytes for PBKDF2 key derivation.
   * 16 bytes (128 bits) provides sufficient entropy.
   */
  private static readonly SALT_LENGTH = 16;

  /**
   * Generates a cryptographically secure random salt for key derivation.
   * 
   * @returns Buffer containing 16 random bytes
   */
  generateSalt(): Buffer {
    return crypto.randomBytes(EncryptionService.SALT_LENGTH);
  }

  /**
   * Derives an encryption key from a password using PBKDF2.
   * 
   * Uses SHA-256 hash algorithm with minimum 100,000 iterations
   * per NIST SP 800-132 recommendations.
   * 
   * @param password - The password to derive the key from
   * @param salt - A 16-byte salt (use generateSalt() to create)
   * @returns Buffer containing the derived 32-byte key
   */
  deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Rotates encryption from an old key to a new key.
   * 
   * Decrypts the ciphertext with the old key and re-encrypts
   * with the new key in a single operation.
   * 
   * @param oldKey - The current encryption key (64 hex characters)
   * @param newKey - The new encryption key (64 hex characters)
   * @param ciphertext - The encrypted data to rotate
   * @param fieldName - Optional field name for error context
   * @param model - Optional model name for audit logging
   * @returns Re-encrypted data with the new key
   * @throws KeyValidationError if either key is invalid
   * @throws DecryptionError if decryption with old key fails
   * @throws EncryptionError if encryption with new key fails
   */
  rotateKey(
    oldKey: string,
    newKey: string,
    ciphertext: string,
    fieldName?: string,
    model?: string
  ): string {
    const correlationId = generateCorrelationId();
    
    // Validate both keys
    this.validateKey(oldKey);
    this.validateKey(newKey);
    
    try {
      // Create temporary service with old key to decrypt
      const oldService = new EncryptionService(oldKey, this.auditLogger);
      const plaintext = oldService.decrypt(ciphertext, fieldName, model);
      
      // Create temporary service with new key to encrypt
      const newService = new EncryptionService(newKey, this.auditLogger);
      const reEncrypted = newService.encrypt(plaintext, fieldName, model);
      
      // Log successful key rotation
      this.logAudit('key_rotation', true, { fieldName, model, correlationId });
      
      return reEncrypted;
    } catch (error) {
      // Log failed key rotation
      this.logAudit('key_rotation', false, {
        fieldName,
        model,
        correlationId,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      });
      
      throw error;
    }
  }

  /**
   * Gets the raw encrypted data without the prefix.
   * Useful for format validation in tests.
   * 
   * @param ciphertext - The encrypted string with prefix
   * @returns Buffer containing IV || AuthTag || Ciphertext
   */
  static getRawEncryptedData(ciphertext: string): Buffer {
    const data = ciphertext.startsWith(EncryptionService.ENCRYPTED_PREFIX)
      ? ciphertext.slice(EncryptionService.ENCRYPTED_PREFIX.length)
      : ciphertext;
    return Buffer.from(data, 'base64');
  }

  /**
   * Gets the encrypted prefix used by this service.
   * Useful for tests and validation.
   */
  static getEncryptedPrefix(): string {
    return EncryptionService.ENCRYPTED_PREFIX;
  }
}

/**
 * Creates a singleton instance of EncryptionService.
 * Uses the ENCRYPTION_KEY environment variable.
 * 
 * @throws KeyValidationError if ENCRYPTION_KEY is invalid
 */
let encryptionServiceInstance: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}

/**
 * Resets the singleton instance.
 * Useful for testing with different keys.
 */
export function resetEncryptionService(): void {
  encryptionServiceInstance = null;
}
