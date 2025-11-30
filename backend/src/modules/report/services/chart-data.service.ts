/**
 * Chart Data Service
 * Handles generation of chart data for visualizations
 */

import { PrismaClient } from '@prisma/client';
import {
  IChartDataSets,
  IIncomeExpenseData,
  ICategoryDistribution,
  IEquityDataPoint,
} from '../statistics.types';

const prisma = new PrismaClient();

export class ChartDataService {
  /**
   * Get all chart data for visualizations
   */
  async getChartData(startDate: Date, endDate: Date): Promise<IChartDataSets> {
    const [incomeVsExpense, expenseDistribution, equityEvolution] = await Promise.all([
      this.getIncomeVsExpenseData(startDate, endDate),
      this.getExpenseDistribution(startDate, endDate),
      this.getEquityEvolution(startDate, endDate),
    ]);

    return { incomeVsExpense, expenseDistribution, equityEvolution };
  }

  /**
   * Get monthly income vs expense comparison
   */
  async getIncomeVsExpenseData(startDate: Date, endDate: Date): Promise<IIncomeExpenseData[]> {
    const entries = await prisma.journalEntry.findMany({
      where: { entryDate: { gte: startDate, lte: endDate }, isPosted: true, isReversed: false },
      select: {
        entryDate: true,
        lines: {
          select: {
            debitAmount: true,
            creditAmount: true,
            account: { select: { type: true } },
          },
        },
      },
    });

    const monthlyData = new Map<string, { income: number; expense: number }>();

    for (const entry of entries) {
      const month = entry.entryDate.toISOString().substring(0, 7);
      if (!monthlyData.has(month)) monthlyData.set(month, { income: 0, expense: 0 });

      const data = monthlyData.get(month)!;
      for (const line of entry.lines) {
        const type = line.account.type;
        const debit = Number(line.debitAmount);
        const credit = Number(line.creditAmount);

        if (type === 'Ingresos') data.income += credit - debit;
        else if (type === 'Gastos' || type === 'Costos') data.expense += debit - credit;
      }
    }

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        income: Math.round(Math.abs(data.income) * 100) / 100,
        expense: Math.round(Math.abs(data.expense) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get expense distribution by category
   */
  async getExpenseDistribution(startDate: Date, endDate: Date): Promise<ICategoryDistribution[]> {
    const balances = await prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      _sum: { debitAmount: true, creditAmount: true },
      where: {
        journalEntry: { entryDate: { gte: startDate, lte: endDate }, isPosted: true, isReversed: false },
        account: { type: 'Gastos', isActive: true, isDetail: true },
      },
    });

    const accountIds = balances.map(b => b.accountId);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true },
    });

    const accountMap = new Map(accounts.map(a => [a.id, a.name]));

    const categories: { category: string; amount: number }[] = [];
    let totalAmount = 0;

    for (const balance of balances) {
      const name = accountMap.get(balance.accountId) ?? 'Otros';
      const amount = Math.abs(Number(balance._sum.debitAmount ?? 0) - Number(balance._sum.creditAmount ?? 0));
      if (amount > 0) {
        categories.push({ category: name, amount });
        totalAmount += amount;
      }
    }

    return categories.map(cat => ({
      category: cat.category,
      amount: Math.round(cat.amount * 100) / 100,
      percentage: totalAmount > 0 ? Math.round((cat.amount / totalAmount) * 10000) / 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get equity evolution over time
   */
  async getEquityEvolution(startDate: Date, endDate: Date): Promise<IEquityDataPoint[]> {
    const entries = await prisma.journalEntry.findMany({
      where: { entryDate: { lte: endDate }, isPosted: true, isReversed: false },
      select: {
        entryDate: true,
        lines: {
          select: {
            debitAmount: true,
            creditAmount: true,
            account: { select: { type: true } },
          },
        },
      },
      orderBy: { entryDate: 'asc' },
    });

    const monthlyEquity = new Map<string, number>();
    let cumulativeEquity = 0;

    for (const entry of entries) {
      const month = entry.entryDate.toISOString().substring(0, 7);

      for (const line of entry.lines) {
        const type = line.account.type;
        const debit = Number(line.debitAmount);
        const credit = Number(line.creditAmount);

        if (type === 'Capital') cumulativeEquity += credit - debit;
        else if (type === 'Ingresos') cumulativeEquity += credit - debit;
        else if (type === 'Gastos' || type === 'Costos') cumulativeEquity -= debit - credit;
      }

      if (entry.entryDate >= startDate) monthlyEquity.set(month, cumulativeEquity);
    }

    return Array.from(monthlyEquity.entries())
      .map(([month, equity]) => ({ month, equity: Math.round(equity * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
