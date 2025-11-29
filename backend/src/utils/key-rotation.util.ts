import { EncryptionService } from './encryption.service';
import { generateCorrelationId } from './encryption.errors';

/**
 * Error entry for a failed record during key rotation.
 */
export interface KeyRotationErrorEntry {
  /** Identifier of the failed record */
  id: string | number;
  /** Error message describing the failure */
  error: string;
  /** Correlation ID for debugging */
  correlationId: string;
}

/**
 * Summary of a batch key rotation operation.
 */
export interface KeyRotationSummary {
  /** Number of records successfully rotated */
  success: number;
  /** Number of records that failed rotation */
  failed: number;
  /** Details of failed records */
  errors: KeyRotationErrorEntry[];
}

/**
 * Record with encrypted fields to be rotated.
 */
export interface EncryptedRecord {
  /** Unique identifier for the record */
  id: string | number;
  /** Map of field names to encrypted values */
  fields: Record<string, string>;
}

/**
 * Result of rotating a single record.
 */
export interface RotatedRecord {
  /** Unique identifier for the record */
  id: string | number;
  /** Map of field names to newly encrypted values */
  fields: Record<string, string>;
}

/**
 * Batch key rotation result including rotated records and summary.
 */
export interface BatchRotationResult {
  /** Successfully rotated records */
  rotatedRecords: RotatedRecord[];
  /** Summary of the rotation operation */
  summary: KeyRotationSummary;
}

/**
 * Utility class for batch key rotation operations.
 * 
 * Handles rotating encryption keys for multiple records,
 * continuing processing even when individual records fail.
 */
export class KeyRotationUtil {
  private readonly encryptionService: EncryptionService;

  constructor(encryptionService?: EncryptionService) {
    this.encryptionService = encryptionService ?? new EncryptionService();
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
  rotateBatch(
    oldKey: string,
    newKey: string,
    records: EncryptedRecord[],
    model?: string
  ): BatchRotationResult {
    const summary: KeyRotationSummary = {
      success: 0,
      failed: 0,
      errors: [],
    };
    const rotatedRecords: RotatedRecord[] = [];

    for (const record of records) {
      const correlationId = generateCorrelationId();
      
      try {
        const rotatedFields: Record<string, string> = {};
        
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
          rotatedFields[fieldName] = this.encryptionService.rotateKey(
            oldKey,
            newKey,
            encryptedValue,
            fieldName,
            model
          );
        }
        
        rotatedRecords.push({
          id: record.id,
          fields: rotatedFields,
        });
        summary.success++;
      } catch (error) {
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
  rotateSingle(
    oldKey: string,
    newKey: string,
    ciphertext: string,
    fieldName?: string,
    model?: string
  ): string {
    return this.encryptionService.rotateKey(oldKey, newKey, ciphertext, fieldName, model);
  }
}
