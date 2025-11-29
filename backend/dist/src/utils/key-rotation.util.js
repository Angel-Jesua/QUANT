"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyRotationUtil = void 0;
const encryption_service_1 = require("./encryption.service");
const encryption_errors_1 = require("./encryption.errors");
/**
 * Utility class for batch key rotation operations.
 *
 * Handles rotating encryption keys for multiple records,
 * continuing processing even when individual records fail.
 */
class KeyRotationUtil {
    constructor(encryptionService) {
        this.encryptionService = encryptionService ?? new encryption_service_1.EncryptionService();
    }
    /**
     * Rotates encryption keys for a batch of records.
     *
     * Processes each record independently, continuing even if some fail.
     * Returns a summary with success/failure counts and error details.
     *
     * @param oldKey - The current encryption key (64 hex characters)
     * @param newKey - The new encryption key (64 hex characters)
     * @param records - Array of records with encrypted fields to rotate
     * @param model - Optional model name for audit logging
     * @returns BatchRotationResult with rotated records and summary
     */
    rotateBatch(oldKey, newKey, records, model) {
        const summary = {
            success: 0,
            failed: 0,
            errors: [],
        };
        const rotatedRecords = [];
        for (const record of records) {
            const correlationId = (0, encryption_errors_1.generateCorrelationId)();
            try {
                const rotatedFields = {};
                // Rotate each encrypted field in the record
                for (const [fieldName, encryptedValue] of Object.entries(record.fields)) {
                    // Skip null/undefined values
                    if (encryptedValue == null) {
                        rotatedFields[fieldName] = encryptedValue;
                        continue;
                    }
                    // Skip values that don't appear to be encrypted
                    if (!this.encryptionService.isEncrypted(encryptedValue)) {
                        rotatedFields[fieldName] = encryptedValue;
                        continue;
                    }
                    // Rotate the encrypted value
                    rotatedFields[fieldName] = this.encryptionService.rotateKey(oldKey, newKey, encryptedValue, fieldName, model);
                }
                rotatedRecords.push({
                    id: record.id,
                    fields: rotatedFields,
                });
                summary.success++;
            }
            catch (error) {
                // Log the failure but continue processing
                summary.failed++;
                summary.errors.push({
                    id: record.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    correlationId,
                });
            }
        }
        return {
            rotatedRecords,
            summary,
        };
    }
    /**
     * Rotates a single encrypted value from old key to new key.
     *
     * Convenience method for rotating individual values.
     *
     * @param oldKey - The current encryption key (64 hex characters)
     * @param newKey - The new encryption key (64 hex characters)
     * @param ciphertext - The encrypted value to rotate
     * @param fieldName - Optional field name for error context
     * @param model - Optional model name for audit logging
     * @returns Re-encrypted value with the new key
     */
    rotateSingle(oldKey, newKey, ciphertext, fieldName, model) {
        return this.encryptionService.rotateKey(oldKey, newKey, ciphertext, fieldName, model);
    }
}
exports.KeyRotationUtil = KeyRotationUtil;
