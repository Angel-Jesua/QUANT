-- Migration: Expand columns for encrypted data storage
-- The encryption adds ~37 bytes overhead + base64 encoding (~33% increase)
-- We need to expand VARCHAR columns to TEXT to accommodate encrypted values

-- Client table
ALTER TABLE "client" ALTER COLUMN "email" TYPE TEXT;
ALTER TABLE "client" ALTER COLUMN "phone" TYPE TEXT;

-- UserAccount table  
ALTER TABLE "user_account" ALTER COLUMN "email" TYPE TEXT;

-- Note: address in Client and description in JournalEntry are already TEXT type
-- Note: notes in Invoice is already TEXT type
