#!/usr/bin/env npx ts-node
/**
 * Encryption Key Generator
 * 
 * Generates a cryptographically secure 32-byte (256-bit) key for AES-256-GCM encryption.
 * The key is output as a 64-character hexadecimal string.
 * 
 * Usage:
 *   npx ts-node scripts/generate-encryption-key.ts
 * 
 * Security Notes:
 * - Store the generated key securely in environment variables or a secrets manager
 * - Never commit the actual key to version control
 * - Keep a secure backup - encrypted data cannot be recovered without the key
 */

import * as crypto from 'crypto';

const KEY_LENGTH = 32; // 32 bytes = 256 bits for AES-256

function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString('hex');
}

function main(): void {
  const key = generateEncryptionKey();
  
  console.log('\n=== AES-256-GCM Encryption Key Generator ===\n');
  console.log('Generated Key (64 hex characters):');
  console.log(`\n  ${key}\n`);
  console.log('Add this to your .env file:');
  console.log(`\n  ENCRYPTION_KEY="${key}"\n`);
  console.log('Security Reminders:');
  console.log('  - Store this key securely');
  console.log('  - Never commit to version control');
  console.log('  - Keep a secure backup');
  console.log('  - Data cannot be recovered without this key\n');
}

main();
