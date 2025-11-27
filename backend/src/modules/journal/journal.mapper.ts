/**
 * Journal Entry Mappers
 * Functions to transform Prisma entities to API response DTOs
 */

import { Prisma } from '@prisma/client';
import { IJournalEntryResponse, IJournalLineResponse } from './journal.types';
import { toDecimal } from './journal.utils';

/**
 * Type for a complete JournalEntry with all relations
 */
export type JournalEntryWithRelations = Prisma.JournalEntryGetPayload<{
  include: {
    lines: { include: { account: true } };
    currency: true;
    createdBy: true;
    postedBy: true;
  };
}>;

/**
 * Type for a JournalEntryLine with account relation
 */
export type JournalLineWithAccount = Prisma.JournalEntryLineGetPayload<{
  include: { account: true };
}>;

/**
 * Maps a single journal line to response format
 */
export function mapJournalLineToResponse(line: JournalLineWithAccount): IJournalLineResponse {
  const debit = toDecimal(line.debitAmount);
  const credit = toDecimal(line.creditAmount);

  return {
    id: line.id,
    lineNumber: line.lineNumber,
    accountId: line.accountId,
    accountNumber: line.account?.accountNumber,
    accountName: line.account?.name,
    description: line.description ?? undefined,
    debitAmount: debit.toFixed(2),
    creditAmount: credit.toFixed(2),
  };
}

/**
 * Maps a Prisma JournalEntry (with lines) to API response format
 * Calculates totals from lines
 */
export function mapJournalEntryToResponse(entry: JournalEntryWithRelations): IJournalEntryResponse {
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  const mappedLines: IJournalLineResponse[] = entry.lines.map((line) => {
    const debit = toDecimal(line.debitAmount);
    const credit = toDecimal(line.creditAmount);
    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);

    return mapJournalLineToResponse(line);
  });

  // Re-calculate totals since mapJournalLineToResponse doesn't accumulate
  totalDebit = new Prisma.Decimal(0);
  totalCredit = new Prisma.Decimal(0);
  
  for (const line of entry.lines) {
    totalDebit = totalDebit.plus(toDecimal(line.debitAmount));
    totalCredit = totalCredit.plus(toDecimal(line.creditAmount));
  }

  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    entryDate: entry.entryDate.toISOString().split('T')[0],
    voucherNumber: entry.voucherNumber ?? undefined,
    description: entry.description,
    currencyId: entry.currencyId,
    currencyCode: entry.currency?.code,
    exchangeRate: entry.exchangeRate.toFixed(6),
    isPosted: entry.isPosted,
    isReversed: entry.isReversed,
    reversedEntryId: entry.reversedEntryId ?? undefined,
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    lines: mappedLines,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    createdById: entry.createdById,
    createdByName: entry.createdBy?.fullName,
    postedAt: entry.postedAt?.toISOString(),
    postedById: entry.postedById ?? undefined,
    postedByName: entry.postedBy?.fullName,
  };
}

/**
 * Maps an array of journal entries to response format
 */
export function mapJournalEntriesToResponse(entries: JournalEntryWithRelations[]): IJournalEntryResponse[] {
  return entries.map(mapJournalEntryToResponse);
}
