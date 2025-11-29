/*
  Warnings:

  - A unique constraint covering the columns `[cedula]` on the table `user_account` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user_account" ADD COLUMN     "cedula" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_account_cedula_key" ON "user_account"("cedula");
