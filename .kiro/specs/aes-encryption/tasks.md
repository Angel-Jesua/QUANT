# Implementation Plan

- [x] 1. Set up encryption infrastructure and error classes





  - [x] 1.1 Create encryption error classes in `backend/src/utils/encryption.errors.ts`


    - Implement `EncryptionError` with correlationId, operation, fieldName properties
    - Implement `DecryptionError` with correlationId, reason ('FORMAT_INVALID' | 'AUTH_TAG_MISMATCH' | 'KEY_INVALID'), fieldName
    - Implement `KeyValidationError` with reason ('MISSING' | 'INVALID_LENGTH' | 'INVALID_FORMAT')
    - Add helper function `generateCorrelationId()` using crypto.randomUUID()
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 1.2 Create encryption configuration in `backend/src/config/encryption.config.ts`


    - Define `EncryptedFieldConfig` interface with model and fields properties
    - Export `ENCRYPTED_FIELDS` array with configurations for Client, UserAccount, JournalEntry, Invoice
    - Export constants: `IV_LENGTH = 12`, `AUTH_TAG_LENGTH = 16`, `KEY_LENGTH = 32`, `PBKDF2_ITERATIONS = 100000`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 2.2_

- [x] 2. Implement core encryption service



  - [x] 2.1 Create EncryptionService class in `backend/src/utils/encryption.service.ts`


    - Implement `validateKey(key: string)` that validates 64 hex characters, throws KeyValidationError
    - Implement `encrypt(plaintext: string)` using AES-256-GCM with random 12-byte IV
    - Implement `decrypt(ciphertext: string)` that parses base64, extracts IV/authTag/data, decrypts
    - Implement `isEncrypted(value: string)` to detect if a value is already encrypted
    - Format output as base64(IV || AuthTag || Ciphertext)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_


  - [x] 2.2 Write property test for key validation (Property 1)

    - **Property 1: Key Validation Correctness**
    - **Validates: Requirements 1.1, 1.2**
    - Test that valid 64-char hex keys are accepted
    - Test that invalid keys (wrong length, non-hex, empty) throw KeyValidationError



  - [x] 2.3 Write property test for non-deterministic encryption (Property 2)
    - **Property 2: Non-Deterministic Encryption**
    - **Validates: Requirements 1.6**
    - Test that encrypting same plaintext twice produces different ciphertext

  - [x] 2.4 Write property test for output format (Property 3)
    - **Property 3: Output Format Compliance**
    - **Validates: Requirements 1.5**
    - Test that encrypted output decodes to correct component lengths (12 + 16 + n bytes)

  - [x] 2.5 Write property test for round-trip (Property 4)

    - **Property 4: Encryption/Decryption Round-Trip**
    - **Validates: Requirements 3.1, 3.2**
    - Test that decrypt(encrypt(plaintext)) === plaintext for all inputs

- [x] 3. Checkpoint - Ensure core encryption tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement error handling and security properties





  - [x] 4.1 Add secure error handling to EncryptionService


    - Ensure error messages never contain plaintext data
    - Add correlation ID to all errors
    - Implement audit logging for crypto operations (operation type, field name, success/failure)
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 4.2 Write property test for error message safety (Property 5)



    - **Property 5: Error Message Safety**
    - **Validates: Requirements 4.1, 4.4, 4.5**
    - Test that error messages don't contain plaintext and include correlation ID


  - [x] 4.3 Write property test for corruption detection (Property 6)
    - **Property 6: Corruption Detection**
    - **Validates: Requirements 4.2**
    - Test that corrupted ciphertext throws DecryptionError with FORMAT_INVALID


  - [x] 4.4 Write property test for tampering detection (Property 7)
    - **Property 7: Tampering Detection**
    - **Validates: Requirements 4.3**
    - Test that modified auth tag throws DecryptionError with AUTH_TAG_MISMATCH

- [x] 5. Implement key derivation and rotation







  - [ ] 5.1 Add key derivation functions to EncryptionService
    - Implement `deriveKey(password: string, salt: Buffer)` using PBKDF2 with SHA-256
    - Use minimum 100,000 iterations per NIST SP 800-132
    - Implement `generateSalt()` returning 16 cryptographically secure random bytes

    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 5.2 Implement key rotation functionality
    - Implement `rotateKey(oldKey: string, newKey: string, ciphertext: string)` 
    - Decrypt with old key, encrypt with new key


    - Return re-encrypted data
    - _Requirements: 5.1, 5.2_

  - [ ] 5.3 Create key rotation utility for batch operations
    - Create `backend/src/utils/key-rotation.util.ts`


    - Implement batch rotation that processes records and returns summary
    - Handle individual failures gracefully, continue processing
    - Return `{ success: number, failed: number, errors: Array<{id, error}> }`

    - _Requirements: 5.3, 5.4_


  - [ ] 5.4 Write property test for key rotation round-trip (Property 8)
    - **Property 8: Key Rotation Round-Trip**
    - **Validates: Requirements 5.2**
    - Test that data encrypted with oldKey is decryptable after rotation with newKey

  - [ ] 5.5 Write property test for key rotation resilience (Property 9)
    - **Property 9: Key Rotation Resilience**
    - **Validates: Requirements 5.3, 5.4**
    - Test that rotation continues after failures and returns accurate counts

- [x] 6. Checkpoint - Ensure encryption service tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Prisma middleware integration





  - [x] 7.1 Create encryption middleware in `backend/src/middleware/encryption.middleware.ts`


    - Implement `createEncryptionMiddleware(config: EncryptedFieldConfig[])` factory
    - Hook into Prisma `$use` for create, update, upsert operations (encrypt before write)
    - Hook into Prisma result processing for findMany, findUnique, findFirst (decrypt after read)
    - Handle nested writes and batch operations
    - _Requirements: 3.1, 3.2_


  - [x] 7.2 Integrate middleware with PrismaClient in server.ts

    - Import and apply encryption middleware to PrismaClient
    - Validate ENCRYPTION_KEY at server startup
    - Throw KeyValidationError and prevent startup if key is invalid
    - _Requirements: 1.2, 3.3, 3.4, 3.5, 3.6_


  - [x] 7.3 Write integration tests for Prisma middleware

    - Test Client model encryption/decryption of email, phone, address, creditLimit
    - Test UserAccount model encryption/decryption of email, phone, recoveryEmail
    - Test JournalEntry model encryption/decryption of description, notes
    - Test that encrypted data in DB is not readable as plaintext
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [x] 8. Update environment configuration



  - [x] 8.1 Update backend/.env.example with ENCRYPTION_KEY placeholder


    - Add ENCRYPTION_KEY variable with instructions for generating 32-byte hex key
    - Add comment explaining key format requirements
    - _Requirements: 7.2_



  - [x] 8.2 Add key generation script

    - Create `backend/scripts/generate-encryption-key.ts`
    - Generate cryptographically secure 32-byte key and output as 64-char hex
    - _Requirements: 7.2_

- [x] 9. Create documentation





  - [x] 9.1 Create encryption documentation in `backend/src/utils/ENCRYPTION.md`


    - Document encrypted data format (base64 of IV:AuthTag:Ciphertext)
    - Document ENCRYPTION_KEY configuration with generation instructions
    - Document key rotation procedure step-by-step
    - List all encrypted fields by model
    - Include security considerations and best practices
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
