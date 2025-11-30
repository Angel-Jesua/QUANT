/**
 * KPI Aggregator Service
 * Handles aggregation of Key Performance Indicators
 */

import { PrismaClient, AccountType } from '@prisma/client';
import { IStatisticsKPIs } from '../statistics.types';
import { isDebitNature } from '../report.types';

const prisma = new PrismaClient();

export class KpiAggregatorService {
  /**
   * Aggregate KPIs from account balances
   */
  async aggregateKPIs(startDate: Date, endDate: Date): Promise<IStatisticsKPIs> {
    const balanceSheetTotals = await this.getBalanceSheetTotals(endDate);
    const incomeStatementTotals = await this.getIncomeStatementTotals(startDate, endDate);

    const netEquity = balanceSheetTotals.totalAssets - balanceSheetTotals.totalLiabilities;
    const netProfitLoss = incomeStatementTotals.totalRevenue - 
      (incomeStatementTotals.totalCosts + incomeStatementTotals.totalExpenses);

    return {
      totalAssets: Math.round(balanceSheetTotals.totalAssets * 100) / 100,
      totalLiabilities: Math.round(balanceSheetTotals.totalLiabilities * 100) / 100,
      netEquity: Math.round(netEquity * 100) / 100,
      periodRevenue: Math.round(incomeStatementTotals.totalRevenue * 100) / 100,
      periodExpenses: Math.round((incomeStatementTotals.totalCosts + incomeStatementTotals.totalExpenses) * 100) / 100,
      netProfitLoss: Math.round(netProfitLoss * 100) / 100,
      isProfit: netProfitLoss >= 0,
    };
  }

  /**
   * Get balance sheet totals as of a specific date
   */
  async getBalanceSheetTotals(asOfDate: Date): Promise<{
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }> {
    const balanceSheetTypes: AccountType[] = ['Activo', 'Pasivo', 'Capital'];

    const balances = await prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      _sum: { debitAmount: true, creditAmount: true },
      where: {
        journalEntry: { entryDate: { lte: asOfDate }, isPosted: true, isReversed: false },
        account: { type: { in: balanceSheetTypes }, isActive: true, isDetail: true },
      },
    });

    const accountIds = balances.map(b => b.accountId);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, type: true },
    });

    const accountTypeMap = new Map(accounts.map(a => [a.id, a.type]));

    let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

    for (const balance of balances) {
      const type = accountTypeMap.get(balance.accountId);
      if (!type) continue;

      const debit = Number(balance._sum.debitAmount ?? 0);
      const credit = Number(balance._sum.creditAmount ?? 0);
      const netBalance = isDebitNature(type) ? debit - credit : credit - debit;

      switch (type) {
        case 'Activo': totalAssets += Math.abs(netBalance); break;
        case 'Pasivo': totalLiabilities += Math.abs(netBalance); break;
        case 'Capital': totalEquity += Math.abs(netBalance); break;
      }
    }

    return { totalAssets, totalLiabilities, totalEquity };
  }

  /**
   * Get income statement totals for a period
   */
  async getIncomeStatementTotals(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    totalCosts: number;
    totalExpenses: number;
  }> {
    const incomeTypes: AccountType[] = ['Ingresos', 'Costos', 'Gastos'];

    const balances = await prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      _sum: { debitAmount: true, creditAmount: true },
      where: {
        journalEntry: { entryDate: { gte: startDate, lte: endDate }, isPosted: true, isReversed: false },
        account: { type: { in: incomeTypes }, isActive: true, isDetail: true },
      },
    });

    const accountIds = balances.map(b => b.accountId);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, type: true },
    });

    const accountTypeMap = new Map(accounts.map(a => [a.id, a.type]));

    let totalRevenue = 0, totalCosts = 0, totalExpenses = 0;

    for (const balance of balances) {
      const type = accountTypeMap.get(balance.accountId);
      if (!type) continue;

      const debit = Number(balance._sum.debitAmount ?? 0);
      const credit = Number(balance._sum.creditAmount ?? 0);
      const netBalance = isDebitNature(type) ? debit - credit : credit - debit;

      switch (type) {
        case 'Ingresos': totalRevenue += Math.abs(netBalance); break;
        case 'Costos': totalCosts += Math.abs(netBalance); break;
        case 'Gastos': totalExpenses += Math.abs(netBalance); break;
      }
    }

    return { totalRevenue, totalCosts, totalExpenses };
  }
}
