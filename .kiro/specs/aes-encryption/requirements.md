# Requirements Document

## Introduction

Este documento especifica los requisitos para implementar un sistema de encriptación AES-256-GCM en el backend de QUANT, siguiendo los estándares ISO/IEC 18033-3 (algoritmos de cifrado por bloques) e ISO/IEC 19772 (autenticación de datos). El sistema proporcionará confidencialidad y autenticación integrada para datos sensibles de clientes, usuarios, asientos contables y facturas.

## Glossary

- **AES-256-GCM**: Advanced Encryption Standard con clave de 256 bits en modo Galois/Counter Mode, proporcionando cifrado autenticado
- **IV (Initialization Vector)**: Vector de inicialización de 12 bytes único para cada operación de cifrado
- **Auth Tag**: Etiqueta de autenticación de 16 bytes generada por GCM para verificar integridad
- **PBKDF2**: Password-Based Key Derivation Function 2, función para derivar claves criptográficas
- **Encryption Service**: Servicio centralizado que encapsula toda la lógica criptográfica
- **Prisma Middleware**: Interceptor que procesa operaciones de base de datos antes/después de su ejecución
- **Key Rotation**: Proceso de reemplazar una clave de encriptación por una nueva y re-encriptar datos existentes

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want a centralized encryption service, so that all cryptographic operations are handled consistently and securely.

#### Acceptance Criteria

1. WHEN the encryption service initializes THEN the Encryption_Service SHALL validate that ENCRYPTION_KEY environment variable contains exactly 64 hexadecimal characters (32 bytes)
2. WHEN the encryption service receives invalid or missing ENCRYPTION_KEY THEN the Encryption_Service SHALL throw a KeyValidationError with descriptive message and prevent server startup
3. WHEN encrypting data THEN the Encryption_Service SHALL generate a unique 12-byte IV using crypto.randomBytes() for each operation
4. WHEN encrypting data THEN the Encryption_Service SHALL use AES-256-GCM algorithm with the validated master key
5. WHEN storing encrypted data THEN the Encryption_Service SHALL format output as base64(iv:authTag:ciphertext) where IV is 12 bytes, authTag is 16 bytes
6. WHEN the same plaintext is encrypted multiple times THEN the Encryption_Service SHALL produce different ciphertext outputs due to unique IVs

### Requirement 2

**User Story:** As a system administrator, I want secure key derivation, so that the encryption keys meet NIST security standards.

#### Acceptance Criteria

1. WHEN deriving encryption keys THEN the Encryption_Service SHALL use PBKDF2 with SHA-256 hash algorithm
2. WHEN deriving encryption keys THEN the Encryption_Service SHALL apply minimum 100,000 iterations as per NIST SP 800-132
3. WHEN a salt is required for key derivation THEN the Encryption_Service SHALL generate a cryptographically secure random salt of 16 bytes

### Requirement 3

**User Story:** As a developer, I want automatic encryption/decryption of sensitive fields, so that I don't need to manually handle cryptographic operations in business logic.

#### Acceptance Criteria

1. WHEN a Prisma create or update operation targets an encryptable field THEN the Prisma_Middleware SHALL encrypt the field value before database write
2. WHEN a Prisma read operation returns an encrypted field THEN the Prisma_Middleware SHALL decrypt the field value before returning to the application
3. WHEN the Prisma middleware processes Client model THEN the Prisma_Middleware SHALL encrypt/decrypt fields: email, phone, address, creditLimit
4. WHEN the Prisma middleware processes UserAccount model THEN the Prisma_Middleware SHALL encrypt/decrypt fields: email, phone, recoveryEmail
5. WHEN the Prisma middleware processes JournalEntry model THEN the Prisma_Middleware SHALL encrypt/decrypt fields: description, notes
6. WHEN the Prisma middleware processes Invoice model THEN the Prisma_Middleware SHALL encrypt/decrypt fields: clientEmail, billingAddress, notes

### Requirement 4

**User Story:** As a developer, I want proper error handling for cryptographic operations, so that failures are handled gracefully without exposing sensitive information.

#### Acceptance Criteria

1. WHEN encryption fails THEN the Encryption_Service SHALL throw an EncryptionError with operation context but without exposing plaintext data
2. WHEN decryption fails due to invalid ciphertext format THEN the Encryption_Service SHALL throw a DecryptionError indicating format corruption
3. WHEN decryption fails due to authentication tag mismatch THEN the Encryption_Service SHALL throw a DecryptionError indicating data tampering
4. WHEN a cryptographic operation completes THEN the Encryption_Service SHALL log the operation type and affected field name without logging actual data values
5. IF an encryption or decryption error occurs THEN the Encryption_Service SHALL include a correlation ID in the error for debugging purposes

### Requirement 5

**User Story:** As a system administrator, I want to rotate encryption keys, so that I can maintain security compliance and respond to potential key compromises.

#### Acceptance Criteria

1. WHEN key rotation is initiated THEN the Encryption_Service SHALL accept both old and new keys as parameters
2. WHEN re-encrypting a record during key rotation THEN the Encryption_Service SHALL decrypt with old key and encrypt with new key in a single transaction
3. WHEN key rotation completes for all records THEN the Encryption_Service SHALL return a summary with count of successfully migrated records and any failures
4. IF key rotation fails for a record THEN the Encryption_Service SHALL log the record identifier and continue processing remaining records

### Requirement 6

**User Story:** As a developer, I want comprehensive tests for the encryption service, so that I can verify cryptographic operations work correctly.

#### Acceptance Criteria

1. WHEN testing encryption THEN the Test_Suite SHALL verify that encrypting the same plaintext twice produces different ciphertext
2. WHEN testing decryption THEN the Test_Suite SHALL verify that decrypted data matches original plaintext exactly
3. WHEN testing with corrupted ciphertext THEN the Test_Suite SHALL verify that DecryptionError is thrown
4. WHEN testing with tampered auth tag THEN the Test_Suite SHALL verify that authentication fails and DecryptionError is thrown
5. WHEN testing key validation THEN the Test_Suite SHALL verify that invalid keys (wrong length, non-hex characters) are rejected

### Requirement 7

**User Story:** As a developer, I want clear documentation for the encryption system, so that I can properly configure and maintain it.

#### Acceptance Criteria

1. WHEN documenting the encryption service THEN the Documentation SHALL specify the exact format of encrypted data storage (base64 of iv:authTag:ciphertext)
2. WHEN documenting configuration THEN the Documentation SHALL include step-by-step guide for generating and setting ENCRYPTION_KEY
3. WHEN documenting key rotation THEN the Documentation SHALL specify the procedure for rotating keys and migrating existing data
4. WHEN documenting the system THEN the Documentation SHALL list all encrypted fields by model with their data types
