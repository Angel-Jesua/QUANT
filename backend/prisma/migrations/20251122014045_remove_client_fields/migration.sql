/*
  Warnings:

  - You are about to drop the column `contact_name` on the `client` table. All the data in the column will be lost.
  - You are about to drop the column `postal_code` on the `client` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "client" DROP COLUMN "contact_name",
DROP COLUMN "postal_code",
DROP COLUMN "state";
