-- Add CHECK constraint to currency table
ALTER TABLE "currency" ADD CONSTRAINT "currency_check" CHECK (is_base_currency = false OR exchange_rate = 1.00);

-- Add CHECK constraint to account table
ALTER TABLE "account" ADD CONSTRAINT "account_check" CHECK (id != parent_account_id);