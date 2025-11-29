import { PrismaClient } from '@prisma/client';
import { calculateAccountLevel } from '../report.types';

const prisma = new PrismaClient();

/**
 * Utility service for common report-related operations
 */
export class ReportUtilsService {
  /**
   * Get available date range for journal entries
   * Useful for UI to show valid date picker boundaries
   */
  async getJournalDateRange(): Promise<{
    minDate: string | null;
    maxDate: string | null;
  }> {
    const result = await prisma.journalEntry.aggregate({
      _min: { entryDate: true },
      _max: { entryDate: true },
      where: { isPosted: true },
    });

    return {
      minDate: result._min.entryDate?.toISOString().split('T')[0] ?? null,
      maxDate: result._max.entryDate?.toISOString().split('T')[0] ?? null,
    };
  }

  /**
   * Get account hierarchy levels present in the system
   * Useful for populating account level filter dropdown
   */
  async getAccountLevels(): Promise<number[]> {
    const accounts = await prisma.account.findMany({
      select: { accountNumber: true },
      where: { isActive: true },
    });

    const levels = new Set<number>();
    for (const account of accounts) {
      levels.add(calculateAccountLevel(account.accountNumber));
    }

    return Array.from(levels).sort((a, b) => a - b);
  }
}
