import crypto from 'crypto';

/**
 * Generates a unique correlation ID for tracking cryptographic operations.
 * Uses crypto.randomUUID() for cryptographically secure unique identifiers.
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Reason codes for key validation failures.
 */
export type KeyValidationReason = 'MISSING' | 'INVALID_LENGTH' | 'INVALID_FORMAT';

/**
 * Reason codes for decryption failures.
 */
export type DecryptionReason = 'FORMAT_INVALID' | 'AUTH_TAG_MISMATCH' | 'KEY_INVALID';

/**
 * Error thrown when encryption key validation fails.
 * Used at server startup to prevent running with invalid configuration.
 */
export class KeyValidationError extends Error {
  public readonly reason: KeyValidationReason;

  constructor(reason: KeyValidationReason, message?: string) {
    const defaultMessages: Record<KeyValidationReason, string> = {
      MISSING: 'Encryption key is missing',
      INVALID_LENGTH: 'Encryption key must be exactly 64 hexadecimal characters (32 bytes)',
      INVALID_FORMAT: 'Encryption key must contain only hexadecimal characters (0-9, a-f, A-F)',
    };

    super(message ?? defaultMessages[reason]);
    this.name = 'KeyValidationError';
    this.reason = reason;
    Object.setPrototypeOf(this, KeyValidationError.prototype);
  }
}

/**
 * Error thrown when encryption operations fail.
 * Never exposes plaintext data in error messages.
 */
export class EncryptionError extends Error {
  public readonly correlationId: string;
  public readonly operation: string;
  public readonly fieldName?: string;

  constructor(operation: string, fieldName?: string, correlationId?: string) {
    super(`Encryption failed for operation: ${operation}${fieldName ? ` on field: ${fieldName}` : ''}`);
    this.name = 'EncryptionError';
    this.correlationId = correlationId ?? generateCorrelationId();
    this.operation = operation;
    this.fieldName = fieldName;
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}

/**
 * Error thrown when decryption operations fail.
 * Provides reason codes to distinguish between format corruption and tampering.
 */
export class DecryptionError extends Error {
  public readonly correlationId: string;
  public readonly reason: DecryptionReason;
  public readonly fieldName?: string;

  constructor(reason: DecryptionReason, fieldName?: string, correlationId?: string) {
    const reasonMessages: Record<DecryptionReason, string> = {
      FORMAT_INVALID: 'Invalid ciphertext format - data may be corrupted',
      AUTH_TAG_MISMATCH: 'Authentication tag verification failed - data may have been tampered',
      KEY_INVALID: 'Decryption failed - invalid key or corrupted data',
    };

    super(`${reasonMessages[reason]}${fieldName ? ` (field: ${fieldName})` : ''}`);
    this.name = 'DecryptionError';
    this.correlationId = correlationId ?? generateCorrelationId();
    this.reason = reason;
    this.fieldName = fieldName;
    Object.setPrototypeOf(this, DecryptionError.prototype);
  }
}
