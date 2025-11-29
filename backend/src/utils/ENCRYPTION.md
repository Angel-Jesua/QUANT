# AES-256-GCM Encryption Service

## Overview

QUANT utiliza un sistema de encriptación AES-256-GCM para proteger datos sensibles en la base de datos. Este documento describe el formato de datos encriptados, la configuración, el procedimiento de rotación de claves y las mejores prácticas de seguridad.

## Encrypted Data Format

Los datos encriptados se almacenan en formato base64 con un prefijo identificador:

```
enc:base64(IV || AuthTag || Ciphertext)
```

### Component Breakdown

| Component | Size | Description |
|-----------|------|-------------|
| Prefix | 4 chars | `enc:` - Identifies encrypted values |
| IV | 12 bytes | Initialization Vector (unique per encryption) |
| AuthTag | 16 bytes | GCM Authentication Tag for integrity verification |
| Ciphertext | Variable | Encrypted data |

### Example

```
Original:     "cliente@ejemplo.com"
Encrypted:    "enc:ABC123...XYZ789" (base64 encoded)
```

### Storage Overhead

The encryption adds approximately 37 bytes overhead:
- 12 bytes IV
- 16 bytes AuthTag
- ~33% base64 encoding overhead
- 4 bytes prefix

For a 255-character email, expect ~340 characters in storage.

## ENCRYPTION_KEY Configuration

### Requirements

The `ENCRYPTION_KEY` environment variable must:
- Be exactly **64 hexadecimal characters** (representing 32 bytes / 256 bits)
- Contain only valid hex characters: `0-9`, `a-f`, `A-F`
- Be set before server startup

### Generating a New Key

#### Option 1: Using the provided script

```bash
cd backend
npx ts-node scripts/generate-encryption-key.ts
```

Output:
```
=== AES-256-GCM Encryption Key Generator ===

Generated Key (64 hex characters):

  a1b2c3d4e5f6...  (64 characters)

Add this to your .env file:

  ENCRYPTION_KEY="a1b2c3d4e5f6..."
```

#### Option 2: Using OpenSSL

```bash
openssl rand -hex 32
```

#### Option 3: Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Setting the Key

Add to your `.env` file:

```env
# AES-256-GCM Encryption Key (64 hex characters = 32 bytes)
# CRITICAL: Keep this key secure and backed up
# Data cannot be recovered without this key
ENCRYPTION_KEY="your_64_character_hex_key_here"
```

### Validation

The server validates the key at startup and will fail to start if:
- Key is missing (`KeyValidationError: MISSING`)
- Key length is not 64 characters (`KeyValidationError: INVALID_LENGTH`)
- Key contains non-hex characters (`KeyValidationError: INVALID_FORMAT`)



## Key Rotation Procedure

Key rotation is the process of replacing the current encryption key with a new one and re-encrypting all existing data.

### When to Rotate Keys

- **Scheduled rotation**: Recommended every 1-2 years for compliance
- **Security incident**: If key compromise is suspected
- **Personnel changes**: When staff with key access leave
- **Compliance requirements**: As mandated by security policies

### Step-by-Step Rotation Process

#### Step 1: Generate New Key

```bash
cd backend
npx ts-node scripts/generate-encryption-key.ts
```

Save the new key securely. You'll need both old and new keys during rotation.

#### Step 2: Create Rotation Script

Create a migration script to rotate all encrypted data:

```typescript
import { PrismaClient } from '@prisma/client';
import { KeyRotationUtil, BatchRotationResult } from './src/utils/key-rotation.util';
import { ENCRYPTED_FIELDS } from './src/config/encryption.config';

const prisma = new PrismaClient();
const rotationUtil = new KeyRotationUtil();

const OLD_KEY = process.env.OLD_ENCRYPTION_KEY!;
const NEW_KEY = process.env.NEW_ENCRYPTION_KEY!;

async function rotateModel(
  modelName: string,
  fields: string[]
): Promise<BatchRotationResult> {
  // Fetch all records
  const records = await (prisma as any)[modelName.toLowerCase()].findMany();
  
  // Prepare records for rotation
  const encryptedRecords = records.map((record: any) => ({
    id: record.id,
    fields: fields.reduce((acc, field) => {
      if (record[field]) acc[field] = record[field];
      return acc;
    }, {} as Record<string, string>),
  }));
  
  // Rotate batch
  const result = rotationUtil.rotateBatch(OLD_KEY, NEW_KEY, encryptedRecords, modelName);
  
  // Update records with new encrypted values
  for (const rotated of result.rotatedRecords) {
    await (prisma as any)[modelName.toLowerCase()].update({
      where: { id: rotated.id },
      data: rotated.fields,
    });
  }
  
  return result;
}

async function main() {
  console.log('Starting key rotation...\n');
  
  for (const config of ENCRYPTED_FIELDS) {
    console.log(`Rotating ${config.model}...`);
    const result = await rotateModel(config.model, config.fields);
    console.log(`  Success: ${result.summary.success}`);
    console.log(`  Failed: ${result.summary.failed}`);
    
    if (result.summary.errors.length > 0) {
      console.log('  Errors:');
      result.summary.errors.forEach(err => {
        console.log(`    - ID ${err.id}: ${err.error}`);
      });
    }
  }
  
  console.log('\nKey rotation complete!');
  console.log('Update ENCRYPTION_KEY in .env to the new key.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

#### Step 3: Execute Rotation

```bash
# Set both keys as environment variables
export OLD_ENCRYPTION_KEY="current_64_char_key"
export NEW_ENCRYPTION_KEY="new_64_char_key"

# Run the rotation script
npx ts-node rotate-keys.ts
```

#### Step 4: Update Configuration

After successful rotation:

1. Update `.env` with the new key:
   ```env
   ENCRYPTION_KEY="new_64_char_key"
   ```

2. Securely delete the old key from all systems

3. Restart the application

#### Step 5: Verify

Test that data can be read correctly with the new key:

```bash
# Run your test suite
npm test

# Or manually verify a record
```

### Handling Rotation Failures

The rotation utility continues processing even when individual records fail:

```typescript
interface KeyRotationSummary {
  success: number;  // Records successfully rotated
  failed: number;   // Records that failed
  errors: Array<{
    id: string | number;
    error: string;
    correlationId: string;
  }>;
}
```

For failed records:
1. Review the error messages and correlation IDs
2. Check if the data is corrupted or was encrypted with a different key
3. Manually investigate and fix individual records
4. Re-run rotation for failed records only

## Encrypted Fields by Model

### Client

| Field | Original Type | Description |
|-------|---------------|-------------|
| `email` | VARCHAR(255) | Client email address |
| `phone` | VARCHAR(50) | Client phone number |
| `address` | TEXT | Client physical address |
| `creditLimit` | DECIMAL | Client credit limit |

### UserAccount

| Field | Original Type | Description |
|-------|---------------|-------------|
| `email` | VARCHAR(255) | User email address |
| `phone` | VARCHAR(50) | User phone number |
| `recoveryEmail` | VARCHAR(255) | Account recovery email |

### JournalEntry

| Field | Original Type | Description |
|-------|---------------|-------------|
| `description` | TEXT | Journal entry description |
| `notes` | TEXT | Additional notes |

### Invoice

| Field | Original Type | Description |
|-------|---------------|-------------|
| `clientEmail` | VARCHAR(255) | Invoice recipient email |
| `billingAddress` | TEXT | Billing address |
| `notes` | TEXT | Invoice notes |



## Security Considerations

### Key Management

1. **Never commit keys to version control**
   - Use `.env` files (gitignored) or secrets managers
   - Use environment variables in production

2. **Secure key storage**
   - Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Encrypt keys at rest
   - Limit access to authorized personnel only

3. **Key backup**
   - Maintain secure backups of encryption keys
   - Data cannot be recovered without the key
   - Store backups in separate secure locations

4. **Access control**
   - Limit who can access the encryption key
   - Audit key access
   - Rotate keys when personnel with access leave

### Cryptographic Standards

This implementation follows:

- **ISO/IEC 18033-3**: Block cipher algorithms (AES)
- **ISO/IEC 19772**: Authenticated encryption (GCM mode)
- **NIST SP 800-38D**: GCM mode specification
- **NIST SP 800-132**: PBKDF2 key derivation (100,000+ iterations)

### Best Practices

1. **Unique IVs**
   - Each encryption generates a unique 12-byte IV
   - Never reuse IVs with the same key

2. **Authentication**
   - GCM mode provides authenticated encryption
   - Tampering is detected via auth tag verification

3. **Error handling**
   - Error messages never expose plaintext data
   - Correlation IDs enable debugging without exposing sensitive info

4. **Audit logging**
   - All crypto operations are logged
   - Logs include operation type, field name, success/failure
   - Logs never include plaintext, ciphertext, or keys

### Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Key exposure | Environment variables, secrets manager |
| Data tampering | GCM authentication tag verification |
| IV reuse | Cryptographically random IV per operation |
| Brute force | 256-bit key space (2^256 combinations) |
| Side-channel attacks | Use Node.js crypto module (OpenSSL) |

## Troubleshooting

### Common Errors

#### KeyValidationError: MISSING

```
Error: Encryption key is missing
```

**Solution**: Set the `ENCRYPTION_KEY` environment variable.

#### KeyValidationError: INVALID_LENGTH

```
Error: Encryption key must be exactly 64 hexadecimal characters (32 bytes)
```

**Solution**: Ensure your key is exactly 64 characters. Generate a new key if needed.

#### KeyValidationError: INVALID_FORMAT

```
Error: Encryption key must contain only hexadecimal characters (0-9, a-f, A-F)
```

**Solution**: Remove any non-hex characters from your key. Generate a new key if needed.

#### DecryptionError: FORMAT_INVALID

```
Error: Invalid ciphertext format - data may be corrupted
```

**Causes**:
- Data was not encrypted by this service
- Data was corrupted in storage
- Base64 encoding is invalid

**Solution**: Check if the data has the `enc:` prefix and valid base64 content.

#### DecryptionError: AUTH_TAG_MISMATCH

```
Error: Authentication tag verification failed - data may have been tampered
```

**Causes**:
- Data was modified after encryption
- Wrong encryption key is being used
- Data corruption

**Solution**: 
- Verify you're using the correct encryption key
- Check for data corruption
- If key was rotated, ensure all data was migrated

### Debugging

Use correlation IDs from error messages to trace issues:

```typescript
try {
  const decrypted = encryptionService.decrypt(ciphertext);
} catch (error) {
  if (error instanceof DecryptionError) {
    console.error(`Decryption failed: ${error.message}`);
    console.error(`Correlation ID: ${error.correlationId}`);
    console.error(`Reason: ${error.reason}`);
  }
}
```

## API Reference

### EncryptionService

```typescript
class EncryptionService {
  // Core operations
  encrypt(plaintext: string, fieldName?: string, model?: string): string;
  decrypt(ciphertext: string, fieldName?: string, model?: string): string;
  
  // Key management
  validateKey(key: string | undefined): void;
  deriveKey(password: string, salt: Buffer): Buffer;
  generateSalt(): Buffer;
  
  // Key rotation
  rotateKey(oldKey: string, newKey: string, ciphertext: string): string;
  
  // Utilities
  isEncrypted(value: string): boolean;
}
```

### KeyRotationUtil

```typescript
class KeyRotationUtil {
  rotateBatch(
    oldKey: string,
    newKey: string,
    records: EncryptedRecord[],
    model?: string
  ): BatchRotationResult;
  
  rotateSingle(
    oldKey: string,
    newKey: string,
    ciphertext: string,
    fieldName?: string,
    model?: string
  ): string;
}
```

## Migrating Existing Data

When you first enable encryption, existing data in the database remains in plaintext. You need to run a migration script to encrypt it.

### Running the Migration

```bash
cd backend

# Ensure ENCRYPTION_KEY is set in .env
npx ts-node scripts/migrate-encrypt-existing-data.ts
```

### What the Migration Does

1. **Validates** the encryption key
2. **Processes** each model (Client, UserAccount, JournalEntry, Invoice)
3. **Skips** values that are already encrypted or null
4. **Encrypts** plaintext values in batches of 100 records
5. **Reports** success/failure counts

### Sample Output

```
🔐 Starting Data Encryption Migration
=====================================

✅ Encryption key validated
✅ Database connected

📦 Processing Client...
   Found 150 records
   Progress: 150/150
   ✅ Encrypted: 145, Skipped: 5, Failed: 0

📦 Processing UserAccount...
   Found 25 records
   Progress: 25/25
   ✅ Encrypted: 25, Skipped: 0, Failed: 0

📦 Processing JournalEntry...
   Found 500 records
   Progress: 500/500
   ✅ Encrypted: 500, Skipped: 0, Failed: 0

📦 Processing Invoice...
   Found 200 records
   Progress: 200/200
   ✅ Encrypted: 180, Skipped: 20, Failed: 0

=====================================
📊 Migration Summary
=====================================

Total Records Processed: 875
Records Encrypted: 850
Records Skipped (already encrypted or null): 25
Records Failed: 0
Duration: 12.34s
-------------------------------------

✅ Migration completed successfully!
```

### Important Notes

- **Backup your database** before running the migration
- Run during a **maintenance window** (low traffic)
- The script is **idempotent** - safe to run multiple times
- Already encrypted values are automatically skipped

## Related Files

- `backend/src/utils/encryption.service.ts` - Core encryption service
- `backend/src/utils/encryption.errors.ts` - Error classes
- `backend/src/utils/key-rotation.util.ts` - Batch key rotation
- `backend/src/config/encryption.config.ts` - Field configuration
- `backend/src/middleware/encryption.middleware.ts` - Prisma middleware
- `backend/scripts/generate-encryption-key.ts` - Key generation script
- `backend/scripts/migrate-encrypt-existing-data.ts` - Migration script for existing data
