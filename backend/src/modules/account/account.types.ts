// Account module type definitions
// Aligns with Prisma Account model and API response shapes

import { AccountType, AccountCurrency, Prisma } from '@prisma/client';

/**
 * Internal Account entity shape as returned by Prisma (service layer)
 */
export interface IAccount {
  id: number;
  code: string;                 // Código de cuenta formato XXX-XXX-XXX
  accountNumber: string;        // Alias para compatibilidad (mismo valor que code)
  name: string;                 // Display name
  description?: string | null;  // Optional description
  type: AccountType;            // Domain classification (Activo, Pasivo, Capital, etc.)
  detailType?: string | null;   // Tipo de detalle (Efectivo, Banco, Cliente, etc.)
  currencyId?: number | null;   // FK to Currency (solo para cuentas de detalle)
  currency?: AccountCurrency | null; // NIO o USD para cuentas de detalle
  parentAccountId?: number | null; // Optional parent account
  isDetail: boolean;            // true = cuenta de detalle, false = cuenta de resumen
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: number;
  updatedById?: number | null;
}

/**
 * API response shape for Account.
 * Mirrors internal entity, normalizing nullables to undefined where appropriate.
 */
export interface IAccountResponse extends Omit<IAccount, 'description' | 'parentAccountId' | 'updatedById' | 'currencyId' | 'detailType' | 'currency'> {
  description?: string;
  detailType?: string;
  currencyId?: number;
  currency?: AccountCurrency;
  parentAccountId?: number;
  updatedById?: number;
}

/**
 * DTO for creating an account
 */
export interface ICreateAccount {
  code: string;                 // Código formato XXX-XXX-XXX
  accountNumber?: string;       // Alias opcional (se usa code si no se proporciona)
  name: string;
  type: AccountType;
  detailType?: string;          // Tipo de detalle opcional
  currencyId?: number;          // Solo requerido para cuentas de detalle
  currency?: AccountCurrency;   // NIO o USD para cuentas de detalle
  description?: string;
  parentAccountId?: number;
  isDetail?: boolean;
  isActive?: boolean;
}

/**
 * DTO for updating an account (partial)
 * Note: code/accountNumber es inmutable y no puede cambiarse via update.
 */
export interface IUpdateAccount {
  name?: string;
  description?: string | null;
  type?: AccountType;
  detailType?: string | null;
  currencyId?: number | null;
  currency?: AccountCurrency | null;
  parentAccountId?: number | null;
  isDetail?: boolean;
  isActive?: boolean;
}

/**
 * Generic request context collected from middleware for audit logging
 */
export interface IRequestContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: number;
}

/**
 * Optional filter type for listing accounts (used at controller level for in-memory filtering)
 */
export interface AccountListQuery {
  search?: string;
  isActive?: boolean;
  type?: AccountType;
  currencyId?: number;
  parentAccountId?: number;
  isDetail?: boolean;
  limit?: number;
  page?: number;
}

/**
 * Create/Update input interfaces required for API layer (distinct from internal service DTOs)
 * Mirrors controller expectations and public API contract.
 */

/**
 * CreateAccountInput - API input shape for creating an account
 */
export interface CreateAccountInput {
  accountNumber: string;
  name: string;
  description?: string;
  type: AccountType;
  currencyId: number;
  parentAccountId?: number;
  isDetail?: boolean;
  isActive?: boolean;
}

/**
 * UpdateAccountInput - API input shape for updating an account
 */
export interface UpdateAccountInput {
  name?: string;
  description?: string;
  type?: AccountType;
  currencyId?: number;
  parentAccountId?: number | null;
  isDetail?: boolean;
  isActive?: boolean;
}
// Hierarchical representation for structured listing
export interface AccountTree extends IAccountResponse {
  children: AccountTree[];
}

// ================================
// BULK IMPORT TYPES
// ================================

/**
 * Single account item for bulk import.
 * Uses parentAccountNumber (text) instead of parentAccountId for hierarchy resolution.
 */
export interface BulkImportAccountItem {
  accountNumber: string;        // Código formato XXX-XXX-XXX (se usa como code)
  name: string;
  type: AccountType;
  detailType?: string;          // Tipo de detalle opcional
  currencyId?: number;          // Solo requerido para cuentas de detalle
  currency?: string;            // NIO o USD para cuentas de detalle
  description?: string;
  parentAccountNumber?: string; // Resolved to parentAccountId during import
  isDetail?: boolean;
  isActive?: boolean;
}

/**
 * Request payload for bulk import endpoint
 */
export interface BulkImportRequest {
  accounts: BulkImportAccountItem[];
  /** If true, existing accounts will be updated instead of returning an error */
  updateExisting?: boolean;
}

/**
 * Result for a single account in bulk import
 */
export interface BulkImportItemResult {
  accountNumber: string;
  success: boolean;
  id?: number;
  error?: string;
}

/**
 * Response from bulk import endpoint
 */
export interface BulkImportResponse {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  /** Number of accounts updated (when updateExisting is true) */
  updatedCount?: number;
  results: BulkImportItemResult[];
}