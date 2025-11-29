"use strict";
/**
 * Journal Entry Mappers
 * Functions to transform Prisma entities to API response DTOs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapJournalLineToResponse = mapJournalLineToResponse;
exports.mapJournalEntryToResponse = mapJournalEntryToResponse;
exports.mapJournalEntriesToResponse = mapJournalEntriesToResponse;
const client_1 = require("@prisma/client");
const journal_utils_1 = require("./journal.utils");
/**
 * Maps a single journal line to response format
 */
function mapJournalLineToResponse(line) {
    const debit = (0, journal_utils_1.toDecimal)(line.debitAmount);
    const credit = (0, journal_utils_1.toDecimal)(line.creditAmount);
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
function mapJournalEntryToResponse(entry) {
    let totalDebit = new client_1.Prisma.Decimal(0);
    let totalCredit = new client_1.Prisma.Decimal(0);
    const mappedLines = entry.lines.map((line) => {
        const debit = (0, journal_utils_1.toDecimal)(line.debitAmount);
        const credit = (0, journal_utils_1.toDecimal)(line.creditAmount);
        totalDebit = totalDebit.plus(debit);
        totalCredit = totalCredit.plus(credit);
        return mapJournalLineToResponse(line);
    });
    // Re-calculate totals since mapJournalLineToResponse doesn't accumulate
    totalDebit = new client_1.Prisma.Decimal(0);
    totalCredit = new client_1.Prisma.Decimal(0);
    for (const line of entry.lines) {
        totalDebit = totalDebit.plus((0, journal_utils_1.toDecimal)(line.debitAmount));
        totalCredit = totalCredit.plus((0, journal_utils_1.toDecimal)(line.creditAmount));
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
function mapJournalEntriesToResponse(entries) {
    return entries.map(mapJournalEntryToResponse);
}
