/**
 * Journal Entry Repository
 * Data access layer for journal entries
 * All database operations and queries
 */

import { PrismaClient, AuditAction, Prisma } from '@prisma/client';
import { IRequestContext, IJournalListQuery } from './journal.types';
import { JournalEntryWithRelations } from './journal.mapper';

const prisma = new PrismaClient();

/**
 * Standard include for journal entry queries
 */
export const journalEntryInclude = {
  lines: { include: { account: true }, orderBy: { lineNumber: 'asc' } as const },
  currency: true,
  createdBy: true,
  postedBy: true,
};

/**
 * Generates the next sequential entry number within a transaction
 * Format: DIARIO-YYYYMM-NNNN (e.g., DIARIO-202511-0001)
 */
export async function generateEntryNumber(tx: Prisma.TransactionClient): Promise<string> {
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
export async function findById(id: number): Promise<JournalEntryWithRelations | null> {
  return prisma.journalEntry.findUnique({
    where: { id },
    include: journalEntryInclude,
  });
}

/**
 * Find journal entry by entry number with all relations
 */
export async function findByEntryNumber(entryNumber: string): Promise<JournalEntryWithRelations | null> {
  return prisma.journalEntry.findUnique({
    where: { entryNumber },
    include: journalEntryInclude,
  });
}

/**
 * Find journal entry by ID (basic, without relations)
 */
export async function findByIdBasic(id: number) {
  return prisma.journalEntry.findUnique({
    where: { id },
  });
}

/**
 * Find journal entry by ID with lines only
 */
export async function findByIdWithLines(id: number) {
  return prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });
}

/**
 * Build where clause for listing journal entries
 */
export function buildListWhereClause(query: IJournalListQuery): Prisma.JournalEntryWhereInput {
  const where: Prisma.JournalEntryWhereInput = {};

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
export async function findMany(query: IJournalListQuery = {}): Promise<{
  entries: JournalEntryWithRelations[];
  total: number;
}> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = buildListWhereClause(query);

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: journalEntryInclude,
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
export async function createAuditLog(
  tx: Prisma.TransactionClient,
  params: {
    userId: number;
    action: AuditAction;
    entityType: string;
    entityId: number;
    oldData?: object;
    newData?: object;
    ctx?: IRequestContext;
  }
): Promise<void> {
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
export async function deleteLinesByEntryId(
  tx: Prisma.TransactionClient,
  journalEntryId: number
): Promise<void> {
  await tx.journalEntryLine.deleteMany({
    where: { journalEntryId },
  });
}

/**
 * Get the Prisma client instance for transactions
 */
export function getPrismaClient(): PrismaClient {
  return prisma;
}

/**
 * Execute operations in a transaction
 */
export async function executeTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}
