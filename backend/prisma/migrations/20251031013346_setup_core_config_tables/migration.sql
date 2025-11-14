-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Activo', 'Pasivo', 'Capital', 'Costos', 'Ingresos', 'Gastos');

-- CreateTable
CREATE TABLE "currency" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "is_base_currency" BOOLEAN NOT NULL DEFAULT false,
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" SERIAL NOT NULL,
    "client_code" VARCHAR(20) NOT NULL,
    "tax_id" VARCHAR(20),
    "name" VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Nicaragua',
    "postal_code" VARCHAR(20),
    "credit_limit" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "currency_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" SERIAL NOT NULL,
    "account_number" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "AccountType" NOT NULL,
    "currency_id" INTEGER NOT NULL,
    "parent_account_id" INTEGER,
    "is_detail" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currency_code_key" ON "currency"("code");

-- CreateIndex
CREATE INDEX "currency_code_idx" ON "currency"("code");

-- CreateIndex
CREATE INDEX "currency_is_base_currency_idx" ON "currency"("is_base_currency");

-- CreateIndex
CREATE INDEX "currency_is_active_idx" ON "currency"("is_active");

-- CreateIndex
CREATE INDEX "currency_created_by_idx" ON "currency"("created_by");

-- CreateIndex
CREATE INDEX "currency_updated_by_idx" ON "currency"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "client_client_code_key" ON "client"("client_code");

-- CreateIndex
CREATE UNIQUE INDEX "client_tax_id_key" ON "client"("tax_id");

-- CreateIndex
CREATE INDEX "client_client_code_idx" ON "client"("client_code");

-- CreateIndex
CREATE INDEX "client_tax_id_idx" ON "client"("tax_id");

-- CreateIndex
CREATE INDEX "client_currency_id_idx" ON "client"("currency_id");

-- CreateIndex
CREATE INDEX "client_created_by_idx" ON "client"("created_by");

-- CreateIndex
CREATE INDEX "client_updated_by_idx" ON "client"("updated_by");

-- CreateIndex
CREATE INDEX "client_is_active_idx" ON "client"("is_active");

-- CreateIndex
CREATE INDEX "client_country_idx" ON "client"("country");

-- CreateIndex
CREATE UNIQUE INDEX "account_account_number_key" ON "account"("account_number");

-- CreateIndex
CREATE INDEX "account_account_number_idx" ON "account"("account_number");

-- CreateIndex
CREATE INDEX "account_type_idx" ON "account"("type");

-- CreateIndex
CREATE INDEX "account_currency_id_idx" ON "account"("currency_id");

-- CreateIndex
CREATE INDEX "account_parent_account_id_idx" ON "account"("parent_account_id");

-- CreateIndex
CREATE INDEX "account_created_by_idx" ON "account"("created_by");

-- CreateIndex
CREATE INDEX "account_updated_by_idx" ON "account"("updated_by");

-- CreateIndex
CREATE INDEX "account_is_detail_idx" ON "account"("is_detail");

-- CreateIndex
CREATE INDEX "account_is_active_idx" ON "account"("is_active");

-- AddForeignKey
ALTER TABLE "currency" ADD CONSTRAINT "currency_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency" ADD CONSTRAINT "currency_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
