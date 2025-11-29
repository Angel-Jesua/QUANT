"use strict";
/**
 * Encryption Configuration
 *
 * Centralized configuration for AES-256-GCM encryption service.
 * Defines which fields are encrypted per model and cryptographic constants.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENCRYPTED_FIELDS = exports.PBKDF2_ITERATIONS = exports.KEY_LENGTH = exports.AUTH_TAG_LENGTH = exports.IV_LENGTH = void 0;
exports.getEncryptedFieldsForModel = getEncryptedFieldsForModel;
exports.isEncryptedField = isEncryptedField;
/**
 * Cryptographic constants following NIST and ISO/IEC standards.
 */
/** Initialization Vector length in bytes (96 bits for GCM) */
exports.IV_LENGTH = 12;
/** Authentication Tag length in bytes (128 bits) */
exports.AUTH_TAG_LENGTH = 16;
/** AES-256 key length in bytes (256 bits) */
exports.KEY_LENGTH = 32;
/** PBKDF2 iterations per NIST SP 800-132 recommendation */
exports.PBKDF2_ITERATIONS = 100000;
/**
 * Configuration of encrypted fields by Prisma model.
 *
 * Models and their sensitive fields:
 * - Client: email, phone, address, creditLimit
 * - UserAccount: email, phone, recoveryEmail
 * - JournalEntry: description, notes
 * - Invoice: clientEmail, billingAddress, notes
 */
exports.ENCRYPTED_FIELDS = [
    {
        model: 'Client',
        fields: ['email', 'phone', 'address', 'creditLimit'],
    },
    {
        model: 'UserAccount',
        fields: ['email', 'phone', 'recoveryEmail'],
    },
    {
        model: 'JournalEntry',
        fields: ['description', 'notes'],
    },
    {
        model: 'Invoice',
        fields: ['clientEmail', 'billingAddress', 'notes'],
    },
];
/**
 * Helper function to get encrypted fields for a specific model.
 * @param modelName - The Prisma model name
 * @returns Array of field names to encrypt, or empty array if model not configured
 */
function getEncryptedFieldsForModel(modelName) {
    const config = exports.ENCRYPTED_FIELDS.find((c) => c.model === modelName);
    return config?.fields ?? [];
}
/**
 * Helper function to check if a field should be encrypted for a given model.
 * @param modelName - The Prisma model name
 * @param fieldName - The field name to check
 * @returns true if the field should be encrypted
 */
function isEncryptedField(modelName, fieldName) {
    const fields = getEncryptedFieldsForModel(modelName);
    return fields.includes(fieldName);
}
