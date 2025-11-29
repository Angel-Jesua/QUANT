"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = exports.NoOpCryptoAuditLogger = exports.ConsoleCryptoAuditLogger = void 0;
exports.getEncryptionService = getEncryptionService;
exports.resetEncryptionService = resetEncryptionService;
exports.generateSearchHash = generateSearchHash;
const crypto_1 = __importDefault(require("crypto"));
const encryption_errors_1 = require("./encryption.errors");
const encryption_config_1 = require("../config/encryption.config");
/**
 * Default console-based audit logger.
 * Logs crypto operations without exposing sensitive data.
 */
class ConsoleCryptoAuditLogger {
    log(entry) {
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
        }
        else {
            console.error('[CRYPTO_AUDIT]', JSON.stringify(logMessage));
        }
    }
}
exports.ConsoleCryptoAuditLogger = ConsoleCryptoAuditLogger;
/**
 * No-op audit logger for testing or when logging is disabled.
 */
class NoOpCryptoAuditLogger {
    log(_entry) {
        // Intentionally empty - no logging
    }
}
exports.NoOpCryptoAuditLogger = NoOpCryptoAuditLogger;
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
class EncryptionService {
    constructor(encryptionKey, auditLogger) {
        const key = encryptionKey ?? process.env.ENCRYPTION_KEY;
        this.validateKey(key);
        this.key = Buffer.from(key, 'hex');
        this.auditLogger = auditLogger ?? new NoOpCryptoAuditLogger();
    }
    /**
     * Creates an audit log entry for a crypto operation.
     * Never includes plaintext, ciphertext, or key data.
     */
    logAudit(operation, success, options) {
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
    validateKey(key) {
        if (!key || key.length === 0) {
            throw new encryption_errors_1.KeyValidationError('MISSING');
        }
        if (key.length !== encryption_config_1.KEY_LENGTH * 2) {
            throw new encryption_errors_1.KeyValidationError('INVALID_LENGTH');
        }
        if (!/^[0-9a-fA-F]+$/.test(key)) {
            throw new encryption_errors_1.KeyValidationError('INVALID_FORMAT');
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
    encrypt(plaintext, fieldName, model) {
        const correlationId = (0, encryption_errors_1.generateCorrelationId)();
        try {
            // Generate unique IV for each encryption (12 bytes for GCM)
            const iv = crypto_1.default.randomBytes(encryption_config_1.IV_LENGTH);
            // Create cipher with AES-256-GCM
            const cipher = crypto_1.default.createCipheriv(EncryptionService.ALGORITHM, this.key, iv);
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
        }
        catch (error) {
            // Log failed encryption with error type (never log plaintext)
            const encryptionError = new encryption_errors_1.EncryptionError('encrypt', fieldName, correlationId);
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
    decrypt(ciphertext, fieldName, model) {
        const correlationId = (0, encryption_errors_1.generateCorrelationId)();
        try {
            // Remove prefix if present
            const data = ciphertext.startsWith(EncryptionService.ENCRYPTED_PREFIX)
                ? ciphertext.slice(EncryptionService.ENCRYPTED_PREFIX.length)
                : ciphertext;
            // Decode from base64
            let combined;
            try {
                combined = Buffer.from(data, 'base64');
            }
            catch {
                const formatError = new encryption_errors_1.DecryptionError('FORMAT_INVALID', fieldName, correlationId);
                this.logAudit('decrypt', false, {
                    fieldName,
                    model,
                    correlationId,
                    errorType: 'FORMAT_INVALID',
                });
                throw formatError;
            }
            // Minimum length: IV (12) + AuthTag (16) + at least 0 bytes ciphertext
            const minLength = encryption_config_1.IV_LENGTH + encryption_config_1.AUTH_TAG_LENGTH;
            if (combined.length < minLength) {
                const formatError = new encryption_errors_1.DecryptionError('FORMAT_INVALID', fieldName, correlationId);
                this.logAudit('decrypt', false, {
                    fieldName,
                    model,
                    correlationId,
                    errorType: 'FORMAT_INVALID',
                });
                throw formatError;
            }
            // Extract components
            const iv = combined.subarray(0, encryption_config_1.IV_LENGTH);
            const authTag = combined.subarray(encryption_config_1.IV_LENGTH, encryption_config_1.IV_LENGTH + encryption_config_1.AUTH_TAG_LENGTH);
            const encrypted = combined.subarray(encryption_config_1.IV_LENGTH + encryption_config_1.AUTH_TAG_LENGTH);
            // Create decipher
            const decipher = crypto_1.default.createDecipheriv(EncryptionService.ALGORITHM, this.key, iv);
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
        }
        catch (error) {
            // Check if it's already a DecryptionError (already logged)
            if (error instanceof encryption_errors_1.DecryptionError) {
                throw error;
            }
            // GCM authentication failure - data may have been tampered
            const authError = new encryption_errors_1.DecryptionError('AUTH_TAG_MISMATCH', fieldName, correlationId);
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
    isEncrypted(value) {
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
            return decoded.length >= encryption_config_1.IV_LENGTH + encryption_config_1.AUTH_TAG_LENGTH;
        }
        catch {
            return false;
        }
    }
    /**
     * Generates a cryptographically secure random salt for key derivation.
     *
     * @returns Buffer containing 16 random bytes
     */
    generateSalt() {
        return crypto_1.default.randomBytes(EncryptionService.SALT_LENGTH);
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
    deriveKey(password, salt) {
        return crypto_1.default.pbkdf2Sync(password, salt, encryption_config_1.PBKDF2_ITERATIONS, encryption_config_1.KEY_LENGTH, 'sha256');
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
    rotateKey(oldKey, newKey, ciphertext, fieldName, model) {
        const correlationId = (0, encryption_errors_1.generateCorrelationId)();
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
        }
        catch (error) {
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
    static getRawEncryptedData(ciphertext) {
        const data = ciphertext.startsWith(EncryptionService.ENCRYPTED_PREFIX)
            ? ciphertext.slice(EncryptionService.ENCRYPTED_PREFIX.length)
            : ciphertext;
        return Buffer.from(data, 'base64');
    }
    /**
     * Gets the encrypted prefix used by this service.
     * Useful for tests and validation.
     */
    static getEncryptedPrefix() {
        return EncryptionService.ENCRYPTED_PREFIX;
    }
}
exports.EncryptionService = EncryptionService;
EncryptionService.ALGORITHM = 'aes-256-gcm';
/**
 * Prefix used to identify encrypted values.
 * This helps detect if a value is already encrypted.
 */
EncryptionService.ENCRYPTED_PREFIX = 'enc:';
/**
 * Salt length in bytes for PBKDF2 key derivation.
 * 16 bytes (128 bits) provides sufficient entropy.
 */
EncryptionService.SALT_LENGTH = 16;
/**
 * Creates a singleton instance of EncryptionService.
 * Uses the ENCRYPTION_KEY environment variable.
 *
 * @throws KeyValidationError if ENCRYPTION_KEY is invalid
 */
let encryptionServiceInstance = null;
function getEncryptionService() {
    if (!encryptionServiceInstance) {
        encryptionServiceInstance = new EncryptionService();
    }
    return encryptionServiceInstance;
}
/**
 * Resets the singleton instance.
 * Useful for testing with different keys.
 */
function resetEncryptionService() {
    encryptionServiceInstance = null;
}
/**
 * Generates a deterministic hash of a value for searchable encrypted fields.
 * Uses HMAC-SHA256 with the encryption key to create a consistent hash
 * that can be used for lookups without exposing the plaintext.
 *
 * @param value - The plaintext value to hash (e.g., email)
 * @param key - Optional encryption key (defaults to ENCRYPTION_KEY env var)
 * @returns 64-character hex string (SHA-256 hash)
 */
function generateSearchHash(value, key) {
    const hashKey = key ?? process.env.ENCRYPTION_KEY;
    if (!hashKey) {
        throw new encryption_errors_1.KeyValidationError('MISSING');
    }
    // Normalize the value (lowercase for emails, trim whitespace)
    const normalizedValue = value.toLowerCase().trim();
    // Use HMAC-SHA256 for deterministic hashing with the encryption key
    const hmac = crypto_1.default.createHmac('sha256', Buffer.from(hashKey, 'hex'));
    hmac.update(normalizedValue);
    return hmac.digest('hex');
}
