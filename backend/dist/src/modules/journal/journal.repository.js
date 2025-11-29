"use strict";
/**
 * Journal Entry Repository
 * Data access layer for journal entries
 * All database operations and queries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.journalEntryInclude = void 0;
exports.generateEntryNumber = generateEntryNumber;
exports.findById = findById;
exports.findByEntryNumber = findByEntryNumber;
exports.findByIdBasic = findByIdBasic;
exports.findByIdWithLines = findByIdWithLines;
exports.buildListWhereClause = buildListWhereClause;
exports.findMany = findMany;
exports.createAuditLog = createAuditLog;
exports.deleteLinesByEntryId = deleteLinesByEntryId;
exports.getPrismaClient = getPrismaClient;
exports.executeTransaction = executeTransaction;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Standard include for journal entry queries
 */
exports.journalEntryInclude = {
    lines: { include: { account: true }, orderBy: { lineNumber: 'asc' } },
    currency: true,
    createdBy: true,
    postedBy: true,
};
/**
 * Generates the next sequential entry number within a transaction
 * Format: DIARIO-YYYYMM-NNNN (e.g., DIARIO-202511-0001)
 */
async function generateEntryNumber(tx) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `DIARIO-${year}${month}-`;
    const lastEntry = await tx.journalEntry.findFirst({
        where: {
            entryNumber: { startsWith: prefix },
        },
        orderBy: { entryNumber: 'desc' },
    });
    let nextNumber = 1;
    if (lastEntry) {
        const lastNumberStr = lastEntry.entryNumber.replace(prefix, '');
        nextNumber = parseInt(lastNumberStr, 10) + 1;
    }
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}
/**
 * Find journal entry by ID with all relations
 */
async function findById(id) {
    return prisma.journalEntry.findUnique({
        where: { id },
        include: exports.journalEntryInclude,
    });
}
/**
 * Find journal entry by entry number with all relations
 */
async function findByEntryNumber(entryNumber) {
    return prisma.journalEntry.findUnique({
        where: { entryNumber },
        include: exports.journalEntryInclude,
    });
}
/**
 * Find journal entry by ID (basic, without relations)
 */
async function findByIdBasic(id) {
    return prisma.journalEntry.findUnique({
        where: { id },
    });
}
/**
 * Find journal entry by ID with lines only
 */
async function findByIdWithLines(id) {
    return prisma.journalEntry.findUnique({
        where: { id },
        include: { lines: true },
    });
}
/**
 * Build where clause for listing journal entries
 */
function buildListWhereClause(query) {
    const where = {};
    if (query.isPosted !== undefined) {
        where.isPosted = query.isPosted;
    }
    if (query.currencyId) {
        where.currencyId = query.currencyId;
    }
    if (query.startDate || query.endDate) {
        where.entryDate = {};
        if (query.startDate) {
            where.entryDate.gte = new Date(query.startDate);
        }
        if (query.endDate) {
            where.entryDate.lte = new Date(query.endDate);
        }
    }
    if (query.search) {
        where.OR = [
            { entryNumber: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { voucherNumber: { contains: query.search, mode: 'insensitive' } },
        ];
    }
    return where;
}
/**
 * List journal entries with filters and pagination
 */
async function findMany(query = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = buildListWhereClause(query);
    const [entries, total] = await Promise.all([
        prisma.journalEntry.findMany({
            where,
            include: exports.journalEntryInclude,
            orderBy: { entryDate: 'desc' },
            skip,
            take: limit,
        }),
        prisma.journalEntry.count({ where }),
    ]);
    return { entries, total };
}
/**
 * Create audit log entry
 */
async function createAuditLog(tx, params) {
    await tx.userAuditLog.create({
        data: {
            userId: params.userId,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            oldData: params.oldData,
            newData: params.newData,
            ipAddress: params.ctx?.ipAddress,
            userAgent: params.ctx?.userAgent,
            success: true,
        },
    });
}
/**
 * Delete journal entry lines by journal entry ID
 */
async function deleteLinesByEntryId(tx, journalEntryId) {
    await tx.journalEntryLine.deleteMany({
        where: { journalEntryId },
    });
}
/**
 * Get the Prisma client instance for transactions
 */
function getPrismaClient() {
    return prisma;
}
/**
 * Execute operations in a transaction
 */
async function executeTransaction(callback) {
    return prisma.$transaction(callback);
}
