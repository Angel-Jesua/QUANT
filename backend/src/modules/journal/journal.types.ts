/**
 * Journal Entry module type definitions
 * Implements double-entry accounting (Partida Doble)
 * Aligns with Prisma JournalEntry and JournalEntryLine models
 */

import { Prisma } from '@prisma/client';

/**
 * DTO for a single journal entry line (debit or credit)
 */
export interface IJournalLineInput {
  accountId: number;
  description?: string;
  debitAmount?: number | string | Prisma.Decimal;
  creditAmount?: number | string | Prisma.Decimal;
}

/**
 * DTO for creating a journal entry with lines
 */
export interface ICreateJournalEntry {
  entryDate: Date | string;
  voucherNumber?: string;
  description: string;
  currencyId: number;
  exchangeRate?: number | string | Prisma.Decimal;
  lines: IJournalLineInput[];
}

/**
 * DTO for updating a journal entry (only non-posted entries)
 */
export interface IUpdateJournalEntry {
  entryDate?: Date | string;
  voucherNumber?: string;
  description?: string;
  currencyId?: number;
  exchangeRate?: number | string | Prisma.Decimal;
  lines?: IJournalLineInput[];
}

/**
 * Response shape for a journal entry line
 */
export interface IJournalLineResponse {
  id: number;
  lineNumber: number;
  accountId: number;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  debitAmount: string;
  creditAmount: string;
}

/**
 * Response shape for a journal entry (header + lines)
 */
export interface IJournalEntryResponse {
  id: number;
  entryNumber: string;
  entryDate: string;
  voucherNumber?: string;
  description: string;
  currencyId: number;
  currencyCode?: string;
  exchangeRate: string;
  isPosted: boolean;
  isReversed: boolean;
  reversedEntryId?: number;
  totalDebit: string;
  totalCredit: string;
  lines: IJournalLineResponse[];
  createdAt: string;
  updatedAt: string;
  createdById: number;
  createdByName?: string;
  postedAt?: string;
  postedById?: number;
  postedByName?: string;
}

/**
 * Request context from middleware for audit logging
 */
export interface IRequestContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: number;
}

/**
 * Filter options for listing journal entries
 */
export interface IJournalListQuery {
  search?: string;
  isPosted?: boolean;
  currencyId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Validation result for double-entry balance check
 */
export interface IBalanceValidation {
  isBalanced: boolean;
  totalDebit: Prisma.Decimal;
  totalCredit: Prisma.Decimal;
  difference: Prisma.Decimal;
  errorMessage?: string;
}
