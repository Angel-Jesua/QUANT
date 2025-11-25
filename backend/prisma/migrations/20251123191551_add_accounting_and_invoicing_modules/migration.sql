-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('draft', 'pending', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cash', 'check', 'bank_transfer', 'credit_card', 'other');

-- CreateEnum
CREATE TYPE "line_type" AS ENUM ('main_service', 'extra_service', 'expense');

-- CreateTable
CREATE TABLE "journal_entry" (
    "id" SERIAL NOT NULL,
    "entry_number" VARCHAR(20) NOT NULL,
    "entry_date" DATE NOT NULL,
    "voucher_number" VARCHAR(50),
    "description" TEXT NOT NULL,
    "currency_id" INTEGER NOT NULL,
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "is_posted" BOOLEAN NOT NULL DEFAULT false,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversed_entry_id" INTEGER,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "posted_at" TIMESTAMP,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "posted_by" INTEGER,

    CONSTRAINT "journal_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_line" (
    "id" SERIAL NOT NULL,
    "journal_entry_id" INTEGER NOT NULL,
    "line_number" INTEGER NOT NULL,
    "account_id" INTEGER NOT NULL,
    "description" VARCHAR(255),
    "debit_amount" DECIMAL(18,2),
    "credit_amount" DECIMAL(18,2),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "invoice_number" VARCHAR(20) NOT NULL,
    "client_id" INTEGER NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency_id" INTEGER NOT NULL,
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "main_service_summary" VARCHAR(255),
    "markup" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "agreed_deposit" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "deposit_percentage" DECIMAL(5,2),
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "balance_due" DECIMAL(18,2),
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "line_number" INTEGER NOT NULL,
    "type" "line_type" NOT NULL DEFAULT 'extra_service',
    "description" VARCHAR(500) NOT NULL,
    "service_category" VARCHAR(100),
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "line_total" DECIMAL(18,2),
    "account_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" SERIAL NOT NULL,
    "payment_number" VARCHAR(20) NOT NULL,
    "client_id" INTEGER NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency_id" INTEGER NOT NULL,
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "payment_method" "payment_method" NOT NULL,
    "reference_number" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocation" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "allocated_amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "payment_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" SERIAL NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "checksum" VARCHAR(64),
    "uploaded_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" INTEGER NOT NULL,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_attachment" (
    "id" SERIAL NOT NULL,
    "attachment_id" INTEGER NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "attached_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attached_by" INTEGER NOT NULL,

    CONSTRAINT "entity_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_entry_number_key" ON "journal_entry"("entry_number");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_line_journal_entry_id_line_number_key" ON "journal_entry_line"("journal_entry_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_invoice_number_key" ON "invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "invoice_invoice_number_idx" ON "invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "invoice_client_id_idx" ON "invoice"("client_id");

-- CreateIndex
CREATE INDEX "invoice_status_idx" ON "invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_invoice_id_line_number_key" ON "invoice_line"("invoice_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_payment_number_key" ON "payment"("payment_number");

-- CreateIndex
CREATE INDEX "payment_client_id_idx" ON "payment"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocation_payment_id_invoice_id_key" ON "payment_allocation"("payment_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_attachment_attachment_id_entity_type_entity_id_key" ON "entity_attachment"("attachment_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_reversed_entry_id_fkey" FOREIGN KEY ("reversed_entry_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line" ADD CONSTRAINT "journal_entry_line_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line" ADD CONSTRAINT "journal_entry_line_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocation" ADD CONSTRAINT "payment_allocation_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocation" ADD CONSTRAINT "payment_allocation_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocation" ADD CONSTRAINT "payment_allocation_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_attachment" ADD CONSTRAINT "entity_attachment_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_attachment" ADD CONSTRAINT "entity_attachment_attached_by_fkey" FOREIGN KEY ("attached_by") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
