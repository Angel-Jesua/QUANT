/**
 * Encryption Configuration
 * 
 * Centralized configuration for AES-256-GCM encryption service.
 * Defines which fields are encrypted per model and cryptographic constants.
 */

/**
 * Configuration interface for encrypted fields per model.
 */
export interface EncryptedFieldConfig {
  /** Prisma model name */
  model: string;
  /** Array of field names to encrypt/decrypt */
  fields: string[];
}

/**
 * Cryptographic constants following NIST and ISO/IEC standards.
 */

/** Initialization Vector length in bytes (96 bits for GCM) */
export const IV_LENGTH = 12;

/** Authentication Tag length in bytes (128 bits) */
export const AUTH_TAG_LENGTH = 16;

/** AES-256 key length in bytes (256 bits) */
export const KEY_LENGTH = 32;

/** PBKDF2 iterations per NIST SP 800-132 recommendation */
export const PBKDF2_ITERATIONS = 100000;

/**
 * Configuration of encrypted fields by Prisma model.
 * 
 * Models and their sensitive fields:
 * - Client: email, phone, address, creditLimit
 * - UserAccount: email, phone, recoveryEmail
 * - JournalEntry: description, notes
 * - Invoice: clientEmail, billingAddress, notes
 */
export const ENCRYPTED_FIELDS: EncryptedFieldConfig[] = [
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
export function getEncryptedFieldsForModel(modelName: string): string[] {
  const config = ENCRYPTED_FIELDS.find((c) => c.model === modelName);
  return config?.fields ?? [];
}

/**
 * Helper function to check if a field should be encrypted for a given model.
 * @param modelName - The Prisma model name
 * @param fieldName - The field name to check
 * @returns true if the field should be encrypted
 */
export function isEncryptedField(modelName: string, fieldName: string): boolean {
  const fields = getEncryptedFieldsForModel(modelName);
  return fields.includes(fieldName);
}
