/**
 * Historical Data Service
 * Handles retrieval of historical financial data for predictions
 */

import { PrismaClient, AccountType } from '@prisma/client';
import { IMonthlyDataPoint } from '../statistics.types';
import { isDebitNature } from '../report.types';

const prisma = new PrismaClient();

export class HistoricalDataService {
  /**
   * Get monthly data for predictions
   */
  async getMonthlyData(
    startDate: Date,
    endDate: Date,
    accountTypes: AccountType[]
  ): Promise<IMonthlyDataPoint[]> {
    const entries = await prisma.journalEntry.findMany({
      where: {
        entryDate: { gte: startDate, lte: endDate },
        isPosted: true,
        isReversed: false,
      },
      select: {
        entryDate: true,
        lines: {
          where: {
            account: { type: { in: accountTypes }, isDetail: true },
          },
          select: {
            debitAmount: true,
            creditAmount: true,
            account: { select: { type: true } },
          },
        },
      },
    });

    const monthlyData = new Map<string, number>();

    for (const entry of entries) {
      const month = entry.entryDate.toISOString().substring(0, 7);
      if (!monthlyData.has(month)) monthlyData.set(month, 0);

      for (const line of entry.lines) {
        const debit = Number(line.debitAmount);
        const credit = Number(line.creditAmount);
        const debitNature = isDebitNature(line.account.type);
        const amount = debitNature ? debit - credit : credit - debit;
        monthlyData.set(month, monthlyData.get(month)! + Math.abs(amount));
      }
    }

    return Array.from(monthlyData.entries())
      .map(([month, value]) => ({ month, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
