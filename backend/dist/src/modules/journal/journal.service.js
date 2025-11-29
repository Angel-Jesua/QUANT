"use strict";
/**
 * Journal Entry Service
 * Implements double-entry accounting (Partida Doble) with atomic transactions
 *
 * This service orchestrates the journal entry operations using:
 * - journal.validation.ts: Double-entry validation rules
 * - journal.repository.ts: Data access operations
 * - journal.mapper.ts: Entity to DTO transformations
 * - journal.utils.ts: Helper utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDoubleEntry = void 0;
exports.createJournalEntry = createJournalEntry;
exports.getJournalEntryById = getJournalEntryById;
exports.getJournalEntryByNumber = getJournalEntryByNumber;
exports.listJournalEntries = listJournalEntries;
exports.updateJournalEntry = updateJournalEntry;
exports.postJournalEntry = postJournalEntry;
exports.deleteJournalEntry = deleteJournalEntry;
exports.reverseJournalEntry = reverseJournalEntry;
const client_1 = require("@prisma/client");
const journal_utils_1 = require("./journal.utils");
const journal_validation_1 = require("./journal.validation");
Object.defineProperty(exports, "validateDoubleEntry", { enumerable: true, get: function () { return journal_validation_1.validateDoubleEntry; } });
const journal_mapper_1 = require("./journal.mapper");
const journal_repository_1 = require("./journal.repository");
/**
 * Validates that the operation is performed in an open period
 * Throws error if the entry belongs to a closed period (previous month)
 */
function validatePeriod(entryDate) {
    const date = new Date(entryDate);
    const now = new Date();
    // Compare year and month
    // If entry is from a previous year, it's definitely closed
    if (date.getFullYear() < now.getFullYear()) {
        throw new Error('No se puede modificar o reversar un asiento de un periodo cerrado (año anterior).');
    }
    // If same year but previous month, it's closed
    if (date.getFullYear() === now.getFullYear() && date.getMonth() < now.getMonth()) {
        throw new Error('No se puede modificar o reversar un asiento de un periodo cerrado (mes anterior).');
    }
}
/**
 * Creates a new journal entry with lines using atomic transaction
 *
 * @param data Journal entry data with lines
 * @param userId ID of the user creating the entry
 * @param ctx Request context for audit logging
 * @throws Error if double-entry validation fails
 */
async function createJournalEntry(data, userId, ctx) {
    // Validate double-entry rules BEFORE any database operation
    const validation = (0, journal_validation_1.validateJournalEntry)(data.lines);
    // Atomic transaction: create header + all lines or nothing
    const result = await (0, journal_repository_1.executeTransaction)(async (tx) => {
        // Generate entry number within transaction to avoid race conditions
        const entryNumber = await (0, journal_repository_1.generateEntryNumber)(tx);
        // Create journal entry header
        const journalEntry = await tx.journalEntry.create({
            data: {
                entryNumber,
                entryDate: new Date(data.entryDate),
                voucherNumber: data.voucherNumber,
                description: data.description,
                currencyId: data.currencyId,
                exchangeRate: (0, journal_utils_1.toDecimal)(data.exchangeRate ?? 1),
                createdById: userId,
                lines: {
                    create: data.lines.map((line, index) => ({
                        lineNumber: index + 1,
                        accountId: line.accountId,
                        description: line.description,
                        debitAmount: (0, journal_utils_1.toDecimal)(line.debitAmount),
                        creditAmount: (0, journal_utils_1.toDecimal)(line.creditAmount),
                    })),
                },
            },
            include: journal_repository_1.journalEntryInclude,
        });
        // Create audit log
        await (0, journal_repository_1.createAuditLog)(tx, {
            userId,
            action: client_1.AuditAction.create,
            entityType: 'journal_entry',
            entityId: journalEntry.id,
            newData: {
                entryNumber,
                description: data.description,
                totalDebit: validation.totalDebit.toFixed(2),
                totalCredit: validation.totalCredit.toFixed(2),
                linesCount: data.lines.length,
            },
            ctx,
        });
        return journalEntry;
    });
    return (0, journal_mapper_1.mapJournalEntryToResponse)(result);
}
/**
 * Gets a journal entry by ID
 */
async function getJournalEntryById(id) {
    const entry = await (0, journal_repository_1.findById)(id);
    if (!entry)
        return null;
    return (0, journal_mapper_1.mapJournalEntryToResponse)(entry);
}
/**
 * Gets a journal entry by entry number
 */
async function getJournalEntryByNumber(entryNumber) {
    const entry = await (0, journal_repository_1.findByEntryNumber)(entryNumber);
    if (!entry)
        return null;
    return (0, journal_mapper_1.mapJournalEntryToResponse)(entry);
}
/**
 * Lists journal entries with optional filters and pagination
 */
async function listJournalEntries(query = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { entries, total } = await (0, journal_repository_1.findMany)(query);
    return {
        data: entries.map(journal_mapper_1.mapJournalEntryToResponse),
        total,
        page,
        limit,
    };
}
/**
 * Updates a journal entry (only if not posted)
 * If lines are provided, replaces all existing lines
 */
async function updateJournalEntry(id, data, userId, ctx) {
    // Check if entry exists and is not posted
    const existingEntry = await (0, journal_repository_1.findByIdWithLines)(id);
    if (!existingEntry) {
        throw new Error('Asiento contable no encontrado');
    }
    if (existingEntry.isPosted) {
        throw new Error('No se puede modificar un asiento ya publicado');
    }
    // Validate period
    validatePeriod(existingEntry.entryDate);
    // If updating lines, validate double-entry
    if (data.lines) {
        (0, journal_validation_1.validateJournalEntry)(data.lines);
    }
    // Atomic update
    const result = await (0, journal_repository_1.executeTransaction)(async (tx) => {
        // If updating lines, delete existing and create new
        if (data.lines) {
            await (0, journal_repository_1.deleteLinesByEntryId)(tx, id);
        }
        const updateData = {
            updatedBy: { connect: { id: userId } },
        };
        if (data.entryDate !== undefined) {
            updateData.entryDate = new Date(data.entryDate);
        }
        if (data.voucherNumber !== undefined) {
            updateData.voucherNumber = data.voucherNumber;
        }
        if (data.description !== undefined) {
            updateData.description = data.description;
        }
        if (data.currencyId !== undefined) {
            updateData.currency = { connect: { id: data.currencyId } };
        }
        if (data.exchangeRate !== undefined) {
            updateData.exchangeRate = (0, journal_utils_1.toDecimal)(data.exchangeRate);
        }
        if (data.lines) {
            updateData.lines = {
                create: data.lines.map((line, index) => ({
                    lineNumber: index + 1,
                    accountId: line.accountId,
                    description: line.description,
                    debitAmount: (0, journal_utils_1.toDecimal)(line.debitAmount),
                    creditAmount: (0, journal_utils_1.toDecimal)(line.creditAmount),
                })),
            };
        }
        const updated = await tx.journalEntry.update({
            where: { id },
            data: updateData,
            include: journal_repository_1.journalEntryInclude,
        });
        // Audit log
        await (0, journal_repository_1.createAuditLog)(tx, {
            userId,
            action: client_1.AuditAction.update,
            entityType: 'journal_entry',
            entityId: id,
            oldData: {
                entryNumber: existingEntry.entryNumber,
                description: existingEntry.description,
            },
            newData: {
                entryNumber: updated.entryNumber,
                description: updated.description,
                linesUpdated: !!data.lines,
            },
            ctx,
        });
        return updated;
    });
    return (0, journal_mapper_1.mapJournalEntryToResponse)(result);
}
/**
 * Posts (publishes) a journal entry, making it immutable
 */
async function postJournalEntry(id, userId, ctx) {
    const entry = await (0, journal_repository_1.findByIdWithLines)(id);
    if (!entry) {
        throw new Error('Asiento contable no encontrado');
    }
    if (entry.isPosted) {
        throw new Error('El asiento ya está publicado');
    }
    // Re-validate before posting
    const lines = entry.lines.map((l) => ({
        accountId: l.accountId,
        debitAmount: l.debitAmount ?? undefined,
        creditAmount: l.creditAmount ?? undefined,
    }));
    const validation = (0, journal_validation_1.validateDoubleEntry)(lines);
    if (!validation.isBalanced) {
        throw new Error(`No se puede publicar: ${validation.errorMessage}`);
    }
    const result = await (0, journal_repository_1.executeTransaction)(async (tx) => {
        const posted = await tx.journalEntry.update({
            where: { id },
            data: {
                isPosted: true,
                postedAt: new Date(),
                postedById: userId,
            },
            include: journal_repository_1.journalEntryInclude,
        });
        await (0, journal_repository_1.createAuditLog)(tx, {
            userId,
            action: client_1.AuditAction.update,
            entityType: 'journal_entry',
            entityId: id,
            newData: {
                action: 'posted',
                entryNumber: posted.entryNumber,
            },
            ctx,
        });
        return posted;
    });
    return (0, journal_mapper_1.mapJournalEntryToResponse)(result);
}
/**
 * Deletes a journal entry (only if not posted)
 */
async function deleteJournalEntry(id, userId, ctx) {
    const entry = await (0, journal_repository_1.findByIdWithLines)(id);
    if (!entry) {
        throw new Error('Asiento contable no encontrado');
    }
    if (entry.isPosted) {
        throw new Error('No se puede eliminar un asiento publicado. Use reversión en su lugar.');
    }
    await (0, journal_repository_1.executeTransaction)(async (tx) => {
        // Lines are deleted automatically via onDelete: Cascade
        await tx.journalEntry.delete({
            where: { id },
        });
        await (0, journal_repository_1.createAuditLog)(tx, {
            userId,
            action: client_1.AuditAction.delete,
            entityType: 'journal_entry',
            entityId: id,
            oldData: {
                entryNumber: entry.entryNumber,
                description: entry.description,
            },
            ctx,
        });
    });
}
/**
 * Creates a reversal entry for a posted journal entry
 * The reversal swaps debits and credits
 */
async function reverseJournalEntry(id, userId, reversalDate, description, ctx) {
    const original = await (0, journal_repository_1.findByIdWithLines)(id);
    if (!original) {
        throw new Error('Asiento contable no encontrado');
    }
    if (!original.isPosted) {
        throw new Error('Solo se pueden reversar asientos publicados');
    }
    if (original.isReversed) {
        throw new Error('Este asiento ya ha sido reversado');
    }
    // Validate period
    validatePeriod(original.entryDate);
    // Create reversal lines (swap debit/credit)
    const reversalLines = original.lines.map((line) => ({
        accountId: line.accountId,
        description: line.description,
        debitAmount: line.creditAmount, // Swap
        creditAmount: line.debitAmount, // Swap
    }));
    const result = await (0, journal_repository_1.executeTransaction)(async (tx) => {
        // Generate entry number for reversal
        const entryNumber = await (0, journal_repository_1.generateEntryNumber)(tx);
        // Create reversal entry
        const reversal = await tx.journalEntry.create({
            data: {
                entryNumber,
                entryDate: new Date(reversalDate),
                voucherNumber: `REV-${original.voucherNumber ?? original.entryNumber}`,
                description: description ?? `Reversión de ${original.entryNumber}: ${original.description}`,
                currencyId: original.currencyId,
                exchangeRate: original.exchangeRate,
                reversedEntryId: original.id,
                isPosted: true, // Reversal entries are posted immediately
                postedAt: new Date(),
                postedById: userId,
                createdById: userId,
                lines: {
                    create: reversalLines.map((line, index) => ({
                        lineNumber: index + 1,
                        accountId: line.accountId,
                        description: line.description,
                        debitAmount: (0, journal_utils_1.toDecimal)(line.debitAmount),
                        creditAmount: (0, journal_utils_1.toDecimal)(line.creditAmount),
                    })),
                },
            },
            include: journal_repository_1.journalEntryInclude,
        });
        // Mark original as reversed
        await tx.journalEntry.update({
            where: { id },
            data: { isReversed: true },
        });
        // Audit log
        await (0, journal_repository_1.createAuditLog)(tx, {
            userId,
            action: client_1.AuditAction.create,
            entityType: 'journal_entry',
            entityId: reversal.id,
            newData: {
                action: 'reversal',
                originalEntryNumber: original.entryNumber,
                reversalEntryNumber: reversal.entryNumber,
            },
            ctx,
        });
        return reversal;
    });
    return (0, journal_mapper_1.mapJournalEntryToResponse)(result);
}
