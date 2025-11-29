-- Script para eliminar todas las cuentas contables
-- Primero eliminar las dependencias

-- Eliminar líneas de asientos contables
DELETE FROM journal_entry_line;

-- Eliminar líneas de facturas
DELETE FROM invoice_line;

-- Eliminar todas las cuentas
DELETE FROM account;

-- Verificar que se eliminaron
SELECT COUNT(*) as remaining_accounts FROM account;
