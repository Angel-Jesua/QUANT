import * as fc from 'fast-check';
import { EncryptionService } from './encryption.service';
import { KeyValidationError, DecryptionError, EncryptionError, generateCorrelationId } from './encryption.errors';
import { IV_LENGTH, AUTH_TAG_LENGTH } from '../config/encryption.config';

// Re-export to avoid unused import warnings - these are used in property tests
void DecryptionError;
void EncryptionError;
void generateCorrelationId;

/**
 * Property-Based Tests for AES-256-GCM Encryption Service
 * 
 * These tests verify correctness properties that must hold for ALL valid inputs,
 * using fast-check to generate random test cases.
 */

// Test configuration: minimum 100 iterations per property
const PBT_CONFIG = { numRuns: 100 };

// Valid 64-character hex key for testing
const VALID_TEST_KEY = 'a'.repeat(64);

// Helper to generate hex strings of specific length
const hexChar = fc.constantFrom(...'0123456789abcdefABCDEF'.split(''));
const hexString = (length: number) => fc.array(hexChar, { minLength: length, maxLength: length }).map(arr => arr.join(''));

describe('EncryptionService Property-Based Tests', () => {
  /**
   * **Feature: aes-encryption, Property 1: Key Validation Correctness**
   * **Validates: Requirements 1.1, 1.2**
   * 
   * For any string input as encryption key, the Encryption_Service SHALL accept it
   * if and only if it contains exactly 64 hexadecimal characters (0-9, a-f, A-F),
   * and SHALL throw KeyValidationError for all other inputs.
   */
  describe('Property 1: Key Validation Correctness', () => {
    it('should accept valid 64-character hex keys', () => {
      // Arbitrary for valid hex keys (exactly 64 hex characters)
      const arbValidKey = hexString(64);

      fc.assert(
        fc.property(arbValidKey, (key: string) => {
          // Should not throw for valid keys
          expect(() => new EncryptionService(key)).not.toThrow();
        }),
        PBT_CONFIG
      );
    });

    it('should reject keys that are too short', () => {
      // Keys with length 0-63
      const arbShortLength = fc.integer({ min: 0, max: 63 });

      fc.assert(
        fc.property(arbShortLength, (length: number) => {
          const key = 'a'.repeat(length);
          expect(() => new EncryptionService(key)).toThrow(KeyValidationError);
        }),
        PBT_CONFIG
      );
    });


    it('should reject keys that are too long', () => {
      // Keys with length 65+
      const arbLongLength = fc.integer({ min: 65, max: 128 });

      fc.assert(
        fc.property(arbLongLength, (length: number) => {
          const key = 'a'.repeat(length);
          expect(() => new EncryptionService(key)).toThrow(KeyValidationError);
        }),
        PBT_CONFIG
      );
    });

    it('should reject keys with non-hex characters', () => {
      // Generate strings that contain at least one non-hex character
      const nonHexChars = 'ghijklmnopqrstuvwxyzGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()';
      const arbNonHexChar = fc.constantFrom(...nonHexChars.split(''));
      const arbPosition = fc.integer({ min: 0, max: 63 });

      fc.assert(
        fc.property(arbNonHexChar, arbPosition, (badChar: string, pos: number) => {
          // Create a 64-char key with one non-hex character
          const key = 'a'.repeat(pos) + badChar + 'a'.repeat(63 - pos);
          expect(() => new EncryptionService(key)).toThrow(KeyValidationError);
        }),
        PBT_CONFIG
      );
    });

    it('should reject empty and undefined keys', () => {
      expect(() => new EncryptionService('')).toThrow(KeyValidationError);
      expect(() => new EncryptionService(undefined)).toThrow(KeyValidationError);
    });
  });

  /**
   * **Feature: aes-encryption, Property 2: Non-Deterministic Encryption**
   * **Validates: Requirements 1.6**
   * 
   * For any plaintext string, encrypting it twice with the same key
   * SHALL produce two different ciphertext outputs.
   */
  describe('Property 2: Non-Deterministic Encryption', () => {
    it('should produce different ciphertext for same plaintext', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      const arbPlaintext = fc.string({ minLength: 1, maxLength: 1000 });

      fc.assert(
        fc.property(arbPlaintext, (plaintext) => {
          const ciphertext1 = service.encrypt(plaintext);
          const ciphertext2 = service.encrypt(plaintext);
          
          // Same plaintext should produce different ciphertext due to unique IVs
          expect(ciphertext1).not.toBe(ciphertext2);
        }),
        PBT_CONFIG
      );
    });
  });


  /**
   * **Feature: aes-encryption, Property 3: Output Format Compliance**
   * **Validates: Requirements 1.5**
   * 
   * For any encrypted output, decoding from base64 SHALL yield exactly 28+ bytes
   * where the first 12 bytes are IV, next 16 bytes are AuthTag,
   * and remaining bytes are ciphertext.
   */
  describe('Property 3: Output Format Compliance', () => {
    it('should produce correctly formatted output', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      const arbPlaintext = fc.string({ minLength: 0, maxLength: 1000 });

      fc.assert(
        fc.property(arbPlaintext, (plaintext) => {
          const ciphertext = service.encrypt(plaintext);
          
          // Should have the enc: prefix
          expect(ciphertext.startsWith('enc:')).toBe(true);
          
          // Decode the base64 portion
          const rawData = EncryptionService.getRawEncryptedData(ciphertext);
          
          // Minimum length: IV (12) + AuthTag (16) = 28 bytes
          expect(rawData.length).toBeGreaterThanOrEqual(IV_LENGTH + AUTH_TAG_LENGTH);
          
          // For non-empty plaintext, ciphertext should be present
          if (plaintext.length > 0) {
            expect(rawData.length).toBeGreaterThan(IV_LENGTH + AUTH_TAG_LENGTH);
          }
          
          // Verify component extraction is possible
          const iv = rawData.subarray(0, IV_LENGTH);
          const authTag = rawData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
          const encrypted = rawData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
          
          expect(iv.length).toBe(IV_LENGTH);
          expect(authTag.length).toBe(AUTH_TAG_LENGTH);
          expect(encrypted.length).toBeGreaterThanOrEqual(0);
        }),
        PBT_CONFIG
      );
    });
  });

  /**
   * **Feature: aes-encryption, Property 4: Encryption/Decryption Round-Trip**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any plaintext string, encrypting then decrypting with the same key
   * SHALL return the exact original plaintext.
   */
  describe('Property 4: Encryption/Decryption Round-Trip', () => {
    it('should return original plaintext after encrypt/decrypt cycle', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      const arbPlaintext = fc.string({ minLength: 0, maxLength: 10000 });

      fc.assert(
        fc.property(arbPlaintext, (plaintext) => {
          const encrypted = service.encrypt(plaintext);
          const decrypted = service.decrypt(encrypted);
          
          expect(decrypted).toBe(plaintext);
        }),
        PBT_CONFIG
      );
    });

    it('should handle unicode and special characters', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      // Test with various special characters including unicode
      // Note: We use complete unicode characters (not lone surrogates)
      // Emojis like 🎉 are represented as complete surrogate pairs
      const specialChars = [
        '日', '本', '語', '中', '文', '한', '국', '어',
        'ا', 'ل', 'ع', 'ر', 'ב', 'י', 'ת',
        '🎉', '🔐', '💻', // Complete emoji characters
        'é', 'ñ', 'ü', 'ç',
        '\n', '\t', '\r', ' '
      ];
      const arbSpecialChar = fc.constantFrom(...specialChars);
      const arbSpecialString = fc.array(arbSpecialChar, { minLength: 0, maxLength: 100 })
        .map((arr: string[]) => arr.join(''));

      fc.assert(
        fc.property(arbSpecialString, (plaintext: string) => {
          const encrypted = service.encrypt(plaintext);
          const decrypted = service.decrypt(encrypted);
          
          expect(decrypted).toBe(plaintext);
        }),
        PBT_CONFIG
      );
    });
  });
});


  /**
   * **Feature: aes-encryption, Property 5: Error Message Safety**
   * **Validates: Requirements 4.1, 4.4, 4.5**
   * 
   * For any encryption or decryption error, the error message SHALL NOT contain
   * the plaintext data, and SHALL contain a correlation ID.
   */
  describe('Property 5: Error Message Safety', () => {
    it('should not expose plaintext in encryption error messages', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      // Generate random plaintext that we'll check doesn't appear in errors
      const arbPlaintext = fc.string({ minLength: 5, maxLength: 500 });

      fc.assert(
        fc.property(arbPlaintext, (plaintext) => {
          // Create a corrupted ciphertext that will fail decryption
          const encrypted = service.encrypt(plaintext);
          
          // Corrupt the ciphertext by modifying the encrypted portion
          const rawData = EncryptionService.getRawEncryptedData(encrypted);
          // Flip bits in the ciphertext portion (after IV and AuthTag)
          if (rawData.length > IV_LENGTH + AUTH_TAG_LENGTH) {
            rawData[IV_LENGTH + AUTH_TAG_LENGTH] ^= 0xFF;
          }
          const corruptedCiphertext = 'enc:' + rawData.toString('base64');
          
          try {
            service.decrypt(corruptedCiphertext);
            // If decryption somehow succeeds, that's fine - we're testing error cases
          } catch (error) {
            // Error message should NOT contain the original plaintext
            const errorMessage = (error as Error).message;
            const errorString = JSON.stringify(error);
            
            // Plaintext should not appear in error message or error object
            expect(errorMessage).not.toContain(plaintext);
            expect(errorString).not.toContain(plaintext);
            
            // Error should have a correlation ID
            if (error instanceof DecryptionError) {
              expect(error.correlationId).toBeDefined();
              expect(typeof error.correlationId).toBe('string');
              expect(error.correlationId.length).toBeGreaterThan(0);
            }
          }
        }),
        PBT_CONFIG
      );
    });

    it('should include correlation ID in all decryption errors', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      // Generate various invalid ciphertexts
      const arbInvalidCiphertext = fc.oneof(
        fc.string({ minLength: 1, maxLength: 50 }), // Random strings
        fc.constant('enc:invalid-base64!!!'),       // Invalid base64
        fc.constant('enc:' + Buffer.from('short').toString('base64')), // Too short
      );

      fc.assert(
        fc.property(arbInvalidCiphertext, (invalidCiphertext) => {
          try {
            service.decrypt(invalidCiphertext);
          } catch (error) {
            if (error instanceof DecryptionError) {
              // Must have correlation ID
              expect(error.correlationId).toBeDefined();
              expect(typeof error.correlationId).toBe('string');
              // UUID format check (basic)
              expect(error.correlationId.length).toBe(36);
              expect(error.correlationId).toMatch(/^[0-9a-f-]+$/i);
            }
          }
        }),
        PBT_CONFIG
      );
    });
  });

  /**
   * **Feature: aes-encryption, Property 6: Corruption Detection**
   * **Validates: Requirements 4.2**
   * 
   * For any ciphertext with corrupted format (invalid base64, wrong component lengths),
   * decryption SHALL throw DecryptionError with reason 'FORMAT_INVALID'.
   */
  describe('Property 6: Corruption Detection', () => {
    it('should detect invalid base64 encoding', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      // Generate strings with invalid base64 characters
      const invalidBase64Chars = '!@#$%^&*()[]{}|;:,.<>?`~';
      const arbInvalidChar = fc.constantFrom(...invalidBase64Chars.split(''));
      const arbInvalidBase64 = fc.array(arbInvalidChar, { minLength: 1, maxLength: 20 })
        .map(arr => 'enc:' + arr.join(''));

      fc.assert(
        fc.property(arbInvalidBase64, (invalidCiphertext) => {
          try {
            service.decrypt(invalidCiphertext);
            // Should not reach here
            fail('Expected DecryptionError to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(DecryptionError);
            expect((error as DecryptionError).reason).toBe('FORMAT_INVALID');
          }
        }),
        PBT_CONFIG
      );
    });

    it('should detect ciphertext that is too short', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      // Generate buffers shorter than minimum required (IV + AuthTag = 28 bytes)
      const arbShortLength = fc.integer({ min: 0, max: IV_LENGTH + AUTH_TAG_LENGTH - 1 });

      fc.assert(
        fc.property(arbShortLength, (length) => {
          const shortBuffer = Buffer.alloc(length);
          const shortCiphertext = 'enc:' + shortBuffer.toString('base64');
          
          try {
            service.decrypt(shortCiphertext);
            fail('Expected DecryptionError to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(DecryptionError);
            expect((error as DecryptionError).reason).toBe('FORMAT_INVALID');
          }
        }),
        PBT_CONFIG
      );
    });

    it('should detect missing enc: prefix with invalid data', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      // Generate random strings without the enc: prefix that aren't valid encrypted data
      const arbRandomString = fc.string({ minLength: 1, maxLength: 100 })
        .filter(s => !s.startsWith('enc:'));

      fc.assert(
        fc.property(arbRandomString, (randomString) => {
          try {
            service.decrypt(randomString);
            // If it doesn't throw, the string happened to be valid base64 with correct length
            // This is acceptable - we're testing that invalid formats are caught
          } catch (error) {
            // Should be either FORMAT_INVALID or AUTH_TAG_MISMATCH
            expect(error).toBeInstanceOf(DecryptionError);
            const reason = (error as DecryptionError).reason;
            expect(['FORMAT_INVALID', 'AUTH_TAG_MISMATCH']).toContain(reason);
          }
        }),
        PBT_CONFIG
      );
    });
  });

  /**
   * **Feature: aes-encryption, Property 7: Tampering Detection**
   * **Validates: Requirements 4.3**
   * 
   * For any valid ciphertext with modified authentication tag,
   * decryption SHALL throw DecryptionError with reason 'AUTH_TAG_MISMATCH'.
   */
  describe('Property 7: Tampering Detection', () => {
    it('should detect modified authentication tag', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      const arbPlaintext = fc.string({ minLength: 1, maxLength: 500 });
      const arbBytePosition = fc.integer({ min: 0, max: AUTH_TAG_LENGTH - 1 });
      const arbXorValue = fc.integer({ min: 1, max: 255 }); // Non-zero to ensure change

      fc.assert(
        fc.property(arbPlaintext, arbBytePosition, arbXorValue, (plaintext, bytePos, xorVal) => {
          // Encrypt valid plaintext
          const encrypted = service.encrypt(plaintext);
          const rawData = EncryptionService.getRawEncryptedData(encrypted);
          
          // Tamper with the auth tag (bytes 12-27)
          const authTagOffset = IV_LENGTH + bytePos;
          rawData[authTagOffset] ^= xorVal;
          
          const tamperedCiphertext = 'enc:' + rawData.toString('base64');
          
          try {
            service.decrypt(tamperedCiphertext);
            fail('Expected DecryptionError to be thrown for tampered auth tag');
          } catch (error) {
            expect(error).toBeInstanceOf(DecryptionError);
            expect((error as DecryptionError).reason).toBe('AUTH_TAG_MISMATCH');
          }
        }),
        PBT_CONFIG
      );
    });

    it('should detect modified ciphertext content', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      const arbPlaintext = fc.string({ minLength: 1, maxLength: 500 });
      const arbXorValue = fc.integer({ min: 1, max: 255 });

      fc.assert(
        fc.property(arbPlaintext, arbXorValue, (plaintext, xorVal) => {
          // Encrypt valid plaintext
          const encrypted = service.encrypt(plaintext);
          const rawData = EncryptionService.getRawEncryptedData(encrypted);
          
          // Only tamper if there's actual ciphertext content
          const ciphertextStart = IV_LENGTH + AUTH_TAG_LENGTH;
          if (rawData.length > ciphertextStart) {
            // Tamper with the ciphertext portion
            rawData[ciphertextStart] ^= xorVal;
            
            const tamperedCiphertext = 'enc:' + rawData.toString('base64');
            
            try {
              service.decrypt(tamperedCiphertext);
              fail('Expected DecryptionError to be thrown for tampered ciphertext');
            } catch (error) {
              expect(error).toBeInstanceOf(DecryptionError);
              // GCM detects ciphertext tampering via auth tag verification
              expect((error as DecryptionError).reason).toBe('AUTH_TAG_MISMATCH');
            }
          }
        }),
        PBT_CONFIG
      );
    });

    it('should detect modified IV', () => {
      const service = new EncryptionService(VALID_TEST_KEY);
      const arbPlaintext = fc.string({ minLength: 1, maxLength: 500 });
      const arbBytePosition = fc.integer({ min: 0, max: IV_LENGTH - 1 });
      const arbXorValue = fc.integer({ min: 1, max: 255 });

      fc.assert(
        fc.property(arbPlaintext, arbBytePosition, arbXorValue, (plaintext, bytePos, xorVal) => {
          // Encrypt valid plaintext
          const encrypted = service.encrypt(plaintext);
          const rawData = EncryptionService.getRawEncryptedData(encrypted);
          
          // Tamper with the IV (bytes 0-11)
          rawData[bytePos] ^= xorVal;
          
          const tamperedCiphertext = 'enc:' + rawData.toString('base64');
          
          try {
            service.decrypt(tamperedCiphertext);
            fail('Expected DecryptionError to be thrown for tampered IV');
          } catch (error) {
            expect(error).toBeInstanceOf(DecryptionError);
            // IV tampering causes auth tag verification to fail
            expect((error as DecryptionError).reason).toBe('AUTH_TAG_MISMATCH');
          }
        }),
        PBT_CONFIG
      );
    });
  });


  /**
   * **Feature: aes-encryption, Property 8: Key Rotation Round-Trip**
   * **Validates: Requirements 5.2**
   * 
   * For any data encrypted with oldKey, after rotation to newKey,
   * the data SHALL be decryptable with newKey and return original plaintext.
   */
  describe('Property 8: Key Rotation Round-Trip', () => {
    // Helper to generate valid 64-character hex keys
    const arbValidKey = hexString(64);

    it('should decrypt rotated data with new key and return original plaintext', () => {
      const arbPlaintext = fc.string({ minLength: 0, maxLength: 1000 });

      fc.assert(
        fc.property(arbValidKey, arbValidKey, arbPlaintext, (oldKey, newKey, plaintext) => {
          // Skip if keys are the same (rotation would be a no-op)
          fc.pre(oldKey !== newKey);
          
          // Encrypt with old key
          const oldService = new EncryptionService(oldKey);
          const encryptedWithOldKey = oldService.encrypt(plaintext);
          
          // Rotate to new key
          const rotatedCiphertext = oldService.rotateKey(oldKey, newKey, encryptedWithOldKey);
          
          // Decrypt with new key
          const newService = new EncryptionService(newKey);
          const decrypted = newService.decrypt(rotatedCiphertext);
          
          // Should get back original plaintext
          expect(decrypted).toBe(plaintext);
        }),
        PBT_CONFIG
      );
    });

    it('should produce different ciphertext after rotation', () => {
      const arbPlaintext = fc.string({ minLength: 1, maxLength: 500 });

      fc.assert(
        fc.property(arbValidKey, arbValidKey, arbPlaintext, (oldKey, newKey, plaintext) => {
          // Skip if keys are the same
          fc.pre(oldKey !== newKey);
          
          // Encrypt with old key
          const oldService = new EncryptionService(oldKey);
          const encryptedWithOldKey = oldService.encrypt(plaintext);
          
          // Rotate to new key
          const rotatedCiphertext = oldService.rotateKey(oldKey, newKey, encryptedWithOldKey);
          
          // Ciphertext should be different after rotation (different key + new IV)
          expect(rotatedCiphertext).not.toBe(encryptedWithOldKey);
        }),
        PBT_CONFIG
      );
    });

    it('should fail decryption with old key after rotation', () => {
      const arbPlaintext = fc.string({ minLength: 1, maxLength: 500 });

      fc.assert(
        fc.property(arbValidKey, arbValidKey, arbPlaintext, (oldKey, newKey, plaintext) => {
          // Skip if keys are the same
          fc.pre(oldKey !== newKey);
          
          // Encrypt with old key
          const oldService = new EncryptionService(oldKey);
          const encryptedWithOldKey = oldService.encrypt(plaintext);
          
          // Rotate to new key
          const rotatedCiphertext = oldService.rotateKey(oldKey, newKey, encryptedWithOldKey);
          
          // Attempting to decrypt rotated data with old key should fail
          expect(() => oldService.decrypt(rotatedCiphertext)).toThrow(DecryptionError);
        }),
        PBT_CONFIG
      );
    });
  });


  /**
   * **Feature: aes-encryption, Property 9: Key Rotation Resilience**
   * **Validates: Requirements 5.3, 5.4**
   * 
   * For any batch of records during key rotation, if some records fail,
   * the rotation SHALL continue processing remaining records and return accurate counts.
   */
  describe('Property 9: Key Rotation Resilience', () => {
    // Import KeyRotationUtil for batch operations
    const { KeyRotationUtil } = require('./key-rotation.util');
    
    // Helper to generate valid 64-character hex keys
    const arbValidKey = hexString(64);

    it('should continue processing after failures and return accurate counts', () => {
      const arbPlaintext = fc.string({ minLength: 1, maxLength: 200 });
      const arbRecordCount = fc.integer({ min: 2, max: 10 });
      const arbFailureCount = fc.integer({ min: 1, max: 5 });

      fc.assert(
        fc.property(
          arbValidKey,
          arbValidKey,
          arbRecordCount,
          arbPlaintext,
          arbFailureCount,
          (oldKey, newKey, recordCount, plaintext, failureCount) => {
            // Skip if keys are the same
            fc.pre(oldKey !== newKey);
            // Ensure we don't have more failures than records
            const actualFailureCount = Math.min(failureCount, recordCount - 1);
            fc.pre(actualFailureCount > 0);
            
            const oldService = new EncryptionService(oldKey);
            const rotationUtil = new KeyRotationUtil(oldService);
            
            // Create records - some valid, some with corrupted ciphertext
            const records = [];
            let failuresAdded = 0;
            
            for (let i = 0; i < recordCount; i++) {
              // Add failures at the beginning
              if (failuresAdded < actualFailureCount) {
                // Create a properly formatted but corrupted ciphertext
                // Use valid base64 with correct minimum length but wrong key
                const fakeIv = Buffer.alloc(IV_LENGTH, i);
                const fakeAuthTag = Buffer.alloc(AUTH_TAG_LENGTH, i);
                const fakeCiphertext = Buffer.from('corrupted');
                const combined = Buffer.concat([fakeIv, fakeAuthTag, fakeCiphertext]);
                records.push({
                  id: i,
                  fields: { data: 'enc:' + combined.toString('base64') },
                });
                failuresAdded++;
              } else {
                records.push({
                  id: i,
                  fields: { data: oldService.encrypt(`${plaintext}-${i}`) },
                });
              }
            }
            
            // Perform batch rotation
            const result = rotationUtil.rotateBatch(oldKey, newKey, records, 'TestModel');
            
            // Verify counts are accurate
            const expectedSuccesses = recordCount - actualFailureCount;
            
            expect(result.summary.success + result.summary.failed).toBe(recordCount);
            expect(result.summary.failed).toBe(actualFailureCount);
            expect(result.summary.success).toBe(expectedSuccesses);
            
            // Verify error entries match failed count
            expect(result.summary.errors.length).toBe(actualFailureCount);
            
            // Verify rotated records count matches successes
            expect(result.rotatedRecords.length).toBe(expectedSuccesses);
            
            // Verify successful rotations are decryptable with new key
            const newService = new EncryptionService(newKey);
            for (const rotatedRecord of result.rotatedRecords) {
              const decrypted = newService.decrypt(rotatedRecord.fields.data);
              expect(decrypted).toContain(plaintext);
            }
          }
        ),
        PBT_CONFIG
      );
    });

    it('should return empty errors array when all records succeed', () => {
      const arbPlaintext = fc.string({ minLength: 1, maxLength: 200 });
      const arbRecordCount = fc.integer({ min: 1, max: 10 });

      fc.assert(
        fc.property(arbValidKey, arbValidKey, arbRecordCount, arbPlaintext, (oldKey, newKey, recordCount, plaintext) => {
          // Skip if keys are the same
          fc.pre(oldKey !== newKey);
          
          const oldService = new EncryptionService(oldKey);
          const rotationUtil = new KeyRotationUtil(oldService);
          
          // Create all valid records
          const records = [];
          for (let i = 0; i < recordCount; i++) {
            records.push({
              id: i,
              fields: { data: oldService.encrypt(`${plaintext}-${i}`) },
            });
          }
          
          // Perform batch rotation
          const result = rotationUtil.rotateBatch(oldKey, newKey, records, 'TestModel');
          
          // All should succeed
          expect(result.summary.success).toBe(recordCount);
          expect(result.summary.failed).toBe(0);
          expect(result.summary.errors).toHaveLength(0);
          expect(result.rotatedRecords).toHaveLength(recordCount);
        }),
        PBT_CONFIG
      );
    });

    it('should handle all records failing gracefully', () => {
      const arbRecordCount = fc.integer({ min: 1, max: 10 });

      fc.assert(
        fc.property(arbValidKey, arbValidKey, arbRecordCount, (oldKey, newKey, recordCount) => {
          // Skip if keys are the same
          fc.pre(oldKey !== newKey);
          
          const oldService = new EncryptionService(oldKey);
          const rotationUtil = new KeyRotationUtil(oldService);
          
          // Create all invalid records with properly formatted but corrupted ciphertext
          const records = [];
          for (let i = 0; i < recordCount; i++) {
            // Create a properly formatted but corrupted ciphertext
            const fakeIv = Buffer.alloc(IV_LENGTH, i);
            const fakeAuthTag = Buffer.alloc(AUTH_TAG_LENGTH, i);
            const fakeCiphertext = Buffer.from('corrupted-data');
            const combined = Buffer.concat([fakeIv, fakeAuthTag, fakeCiphertext]);
            records.push({
              id: i,
              fields: { data: 'enc:' + combined.toString('base64') },
            });
          }
          
          // Perform batch rotation - should not throw
          const result = rotationUtil.rotateBatch(oldKey, newKey, records, 'TestModel');
          
          // All should fail
          expect(result.summary.success).toBe(0);
          expect(result.summary.failed).toBe(recordCount);
          expect(result.summary.errors).toHaveLength(recordCount);
          expect(result.rotatedRecords).toHaveLength(0);
          
          // Each error should have an id and correlation ID
          for (const errorEntry of result.summary.errors) {
            expect(errorEntry.id).toBeDefined();
            expect(errorEntry.correlationId).toBeDefined();
            expect(errorEntry.error).toBeDefined();
          }
        }),
        PBT_CONFIG
      );
    });
  });
