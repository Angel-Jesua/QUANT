// Account module type definitions
// Aligns with Prisma Account model and API response shapes

import { AccountType, Prisma } from '@prisma/client';

/**
 * Internal Account entity shape as returned by Prisma (service layer)
 */
export interface IAccount {
  id: number;
  accountNumber: string;        // Unique account identifier (1-20 chars)
  name: string;                 // Display name
  description?: string | null;  // Optional description
  type: AccountType;            // Domain classification
  currencyId: number;           // FK to Currency
  parentAccountId?: number | null; // Optional parent account
  isDetail: boolean;            // true when leaf (no children)
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
export interface IAccountResponse extends Omit<IAccount, 'description' | 'parentAccountId' | 'updatedById'> {
  description?: string;
  parentAccountId?: number;
  updatedById?: number;
}

/**
 * DTO for creating an account
 */
export interface ICreateAccount {
  accountNumber: string;
  name: string;
  type: AccountType;
  currencyId: number;
  description?: string;
  parentAccountId?: number;
  isDetail?: boolean;
  isActive?: boolean;
}

/**
 * DTO for updating an account (partial)
 * Note: accountNumber is immutable and cannot be changed via update.
 */
export interface IUpdateAccount {
  name?: string;
  description?: string | null;
  type?: AccountType;
  currencyId?: number;
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