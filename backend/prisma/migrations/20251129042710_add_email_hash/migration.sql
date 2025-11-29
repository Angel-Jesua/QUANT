/*
  Warnings:

  - A unique constraint covering the columns `[email_hash]` on the table `user_account` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user_account" ADD COLUMN     "email_hash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_hash_key" ON "user_account"("email_hash");

-- CreateIndex
CREATE INDEX "user_account_email_hash_idx" ON "user_account"("email_hash");
