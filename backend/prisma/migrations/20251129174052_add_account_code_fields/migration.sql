/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `account` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "account_currency" AS ENUM ('NIO', 'USD');

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_currency_id_fkey";

-- AlterTable: Add columns (code as nullable first)
ALTER TABLE "account" 
ADD COLUMN "account_currency" "account_currency",
ADD COLUMN "code" VARCHAR(11),
ADD COLUMN "detail_type" VARCHAR(100),
ALTER COLUMN "currency_id" DROP NOT NULL;

-- Copy account_number to code for existing records
UPDATE "account" SET "code" = "account_number" WHERE "code" IS NULL;

-- Now make code NOT NULL
ALTER TABLE "account" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "account_code_key" ON "account"("code");

-- CreateIndex
CREATE INDEX "account_code_idx" ON "account"("code");

-- CreateIndex
CREATE INDEX "account_detail_type_idx" ON "account"("detail_type");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
