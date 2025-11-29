"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecryptionError = exports.EncryptionError = exports.KeyValidationError = void 0;
exports.generateCorrelationId = generateCorrelationId;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates a unique correlation ID for tracking cryptographic operations.
 * Uses crypto.randomUUID() for cryptographically secure unique identifiers.
 */
function generateCorrelationId() {
    return crypto_1.default.randomUUID();
}
/**
 * Error thrown when encryption key validation fails.
 * Used at server startup to prevent running with invalid configuration.
 */
class KeyValidationError extends Error {
    constructor(reason, message) {
        const defaultMessages = {
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
exports.KeyValidationError = KeyValidationError;
/**
 * Error thrown when encryption operations fail.
 * Never exposes plaintext data in error messages.
 */
class EncryptionError extends Error {
    constructor(operation, fieldName, correlationId) {
        super(`Encryption failed for operation: ${operation}${fieldName ? ` on field: ${fieldName}` : ''}`);
        this.name = 'EncryptionError';
        this.correlationId = correlationId ?? generateCorrelationId();
        this.operation = operation;
        this.fieldName = fieldName;
        Object.setPrototypeOf(this, EncryptionError.prototype);
    }
}
exports.EncryptionError = EncryptionError;
/**
 * Error thrown when decryption operations fail.
 * Provides reason codes to distinguish between format corruption and tampering.
 */
class DecryptionError extends Error {
    constructor(reason, fieldName, correlationId) {
        const reasonMessages = {
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
exports.DecryptionError = DecryptionError;
