/**
 * Migration Script: Encrypt Existing Data
 * 
 * This script encrypts existing plaintext data in the database.
 * It processes records in batches and skips already-encrypted values.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-encrypt-existing-data.ts
 * 
 * IMPORTANT: 
 * - Backup your database before running this script
 * - Ensure ENCRYPTION_KEY is set in environment
 * - Run during maintenance window (low traffic)
 */

import { PrismaClient } from '@prisma/client';
import { EncryptionService, generateSearchHash } from '../src/utils/encryption.service';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Prisma without encryption middleware (raw access)
const prisma = new PrismaClient();

// Initialize encryption service
let encryptionService: EncryptionService;

interface MigrationResult {
  model: string;
  total: number;
  encrypted: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: number; field: string; error: string }>;
}

interface FieldConfig {
  model: string;
  fields: string[];
  idField: string;
}

// Configuration for fields that need hash generation for searchability
interface HashFieldConfig {
  model: string;
  sourceField: string;
  hashField: string;
  idField: string;
}

const HASH_FIELD_CONFIG: HashFieldConfig[] = [
  {
    model: 'UserAccount',
    sourceField: 'email',
    hashField: 'emailHash',
    idField: 'id',
  },
];

// Configuration based on actual Prisma schema
const MIGRATION_CONFIG: FieldConfig[] = [
  {
    model: 'Client',
    fields: ['email', 'phone', 'address'],
    idField: 'id',
  },
  {
    model: 'UserAccount',
    fields: ['email'],
    idField: 'id',
  },
  {
    model: 'JournalEntry',
    fields: ['description'],
    idField: 'id',
  },
  {
    model: 'Invoice',
    fields: ['notes'],
    idField: 'id',
  },
];

const BATCH_SIZE = 100;


/**
 * Encrypts a single field value if it's not already encrypted.
 */
function encryptIfNeeded(value: string | null, fieldName: string, model: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Skip if already encrypted
  if (encryptionService.isEncrypted(value)) {
    return null; // Signal to skip
  }
  
  return encryptionService.encrypt(value, fieldName, model);
}

/**
 * Migrates a single model's data.
 */
async function migrateModel(config: FieldConfig): Promise<MigrationResult> {
  const result: MigrationResult = {
    model: config.model,
    total: 0,
    encrypted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log(`\n📦 Processing ${config.model}...`);

  try {
    // Get model reference dynamically
    const modelRef = (prisma as any)[config.model.charAt(0).toLowerCase() + config.model.slice(1)];
    
    if (!modelRef) {
      console.log(`   ⚠️  Model ${config.model} not found in Prisma client`);
      return result;
    }

    // Count total records
    result.total = await modelRef.count();
    console.log(`   Found ${result.total} records`);

    if (result.total === 0) {
      return result;
    }

    // Process in batches
    let offset = 0;
    while (offset < result.total) {
      const records = await modelRef.findMany({
        skip: offset,
        take: BATCH_SIZE,
        select: {
          [config.idField]: true,
          ...Object.fromEntries(config.fields.map(f => [f, true])),
        },
      });

      for (const record of records) {
        const updates: Record<string, string> = {};
        let hasUpdates = false;
        let recordFailed = false;

        for (const field of config.fields) {
          const value = record[field];
          
          try {
            const encrypted = encryptIfNeeded(value, field, config.model);
            
            if (encrypted === null) {
              // Already encrypted or null value
              result.skipped++;
            } else {
              updates[field] = encrypted;
              hasUpdates = true;
            }
          } catch (error) {
            recordFailed = true;
            result.failed++;
            result.errors.push({
              id: record[config.idField],
              field,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        if (hasUpdates && !recordFailed) {
          try {
            await modelRef.update({
              where: { [config.idField]: record[config.idField] },
              data: updates,
            });
            result.encrypted++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              id: record[config.idField],
              field: 'update',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      offset += BATCH_SIZE;
      process.stdout.write(`   Progress: ${Math.min(offset, result.total)}/${result.total}\r`);
    }

    console.log(`   ✅ Encrypted: ${result.encrypted}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
  } catch (error) {
    console.error(`   ❌ Error processing ${config.model}:`, error);
  }

  return result;
}


/**
 * Generates search hashes for encrypted fields that need to be searchable.
 * This allows lookups by email without exposing the plaintext.
 */
async function generateSearchHashes(): Promise<void> {
  console.log('\n🔑 Generating search hashes for encrypted fields...');
  
  for (const config of HASH_FIELD_CONFIG) {
    console.log(`\n   Processing ${config.model}.${config.hashField}...`);
    
    const modelRef = (prisma as any)[config.model.charAt(0).toLowerCase() + config.model.slice(1)];
    if (!modelRef) {
      console.log(`   ⚠️  Model ${config.model} not found`);
      continue;
    }
    
    // Get all records that need hash generation
    const records = await modelRef.findMany({
      select: {
        [config.idField]: true,
        [config.sourceField]: true,
        [config.hashField]: true,
      },
    });
    
    let updated = 0;
    let skipped = 0;
    
    for (const record of records) {
      // Skip if hash already exists
      if (record[config.hashField]) {
        skipped++;
        continue;
      }
      
      const sourceValue = record[config.sourceField];
      if (!sourceValue) {
        skipped++;
        continue;
      }
      
      // If the value is encrypted, we need to decrypt it first to generate the hash
      let plaintext = sourceValue;
      if (encryptionService.isEncrypted(sourceValue)) {
        try {
          plaintext = encryptionService.decrypt(sourceValue, config.sourceField, config.model);
        } catch (error) {
          console.log(`   ⚠️  Could not decrypt ${config.sourceField} for ID ${record[config.idField]}`);
          continue;
        }
      }
      
      // Generate hash from plaintext
      const hash = generateSearchHash(plaintext);
      
      await modelRef.update({
        where: { [config.idField]: record[config.idField] },
        data: { [config.hashField]: hash },
      });
      
      updated++;
    }
    
    console.log(`   ✅ Updated: ${updated}, Skipped: ${skipped}`);
  }
}

/**
 * Main migration function.
 */
async function main() {
  console.log('🔐 Starting Data Encryption Migration');
  console.log('=====================================\n');

  // Validate encryption key
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.error('❌ ENCRYPTION_KEY environment variable is not set');
    console.error('   Generate one with: npx ts-node scripts/generate-encryption-key.ts');
    process.exit(1);
  }

  try {
    encryptionService = new EncryptionService(encryptionKey);
    console.log('✅ Encryption key validated');
  } catch (error) {
    console.error('❌ Invalid encryption key:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  const results: MigrationResult[] = [];
  const startTime = Date.now();

  // Process each model
  for (const config of MIGRATION_CONFIG) {
    const result = await migrateModel(config);
    results.push(result);
  }
  
  // Generate search hashes for encrypted fields
  await generateSearchHashes();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log('\n=====================================');
  console.log('📊 Migration Summary');
  console.log('=====================================\n');

  let totalRecords = 0;
  let totalEncrypted = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const result of results) {
    console.log(`${result.model}:`);
    console.log(`   Total: ${result.total}, Encrypted: ${result.encrypted}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors:`);
      for (const err of result.errors.slice(0, 5)) {
        console.log(`     - ID ${err.id}, Field: ${err.field}: ${err.error}`);
      }
      if (result.errors.length > 5) {
        console.log(`     ... and ${result.errors.length - 5} more errors`);
      }
    }

    totalRecords += result.total;
    totalEncrypted += result.encrypted;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  console.log('\n-------------------------------------');
  console.log(`Total Records Processed: ${totalRecords}`);
  console.log(`Records Encrypted: ${totalEncrypted}`);
  console.log(`Records Skipped (already encrypted or null): ${totalSkipped}`);
  console.log(`Records Failed: ${totalFailed}`);
  console.log(`Duration: ${duration}s`);
  console.log('-------------------------------------\n');

  if (totalFailed > 0) {
    console.log('⚠️  Some records failed to encrypt. Review errors above.');
    process.exit(1);
  } else {
    console.log('✅ Migration completed successfully!');
  }
}

// Run migration
main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
