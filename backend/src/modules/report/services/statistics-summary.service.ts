/**
 * Statistics Summary Service
 * Handles generation of financial report summaries for statistics
 */

import { PrismaClient, AccountType } from '@prisma/client';
import {
  IBalanceSheetSummaryStats,
  IIncomeStatementSummaryStats,
  ITrialBalanceSummaryStats,
  IAccountCategorySummary,
  IAccountBalanceStats,
  ITrialBalanceAccountStats,
} from '../statistics.types';
import { isDebitNature } from '../report.types';

const prisma = new PrismaClient();

export class StatisticsSummaryService {
  /**
   * Get balance sheet summary with hierarchical structure
   */
  async getBalanceSheetSummary(asOfDate: Date): Promise<IBalanceSheetSummaryStats> {
    const balanceSheetTypes: AccountType[] = ['Activo', 'Pasivo', 'Capital'];

    const balances = await prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      _sum: { debitAmount: true, creditAmount: true },
      where: {
        journalEntry: { entryDate: { lte: asOfDate }, isPosted: true, isReversed: false },
        account: { type: { in: balanceSheetTypes }, isActive: true },
      },
    });

    const balanceMap = new Map(
      balances.map(b => [b.accountId, {
        debit: Number(b._sum.debitAmount ?? 0),
        credit: Number(b._sum.creditAmount ?? 0),
      }])
    );

    const accounts = await prisma.account.findMany({
      where: { type: { in: balanceSheetTypes }, isActive: true },
      select: { id: true, accountNumber: true, name: true, type: true, isDetail: true, parentAccountId: true },
      orderBy: { accountNumber: 'asc' },
    });

    const assets = this.buildAccountCategories(accounts, balanceMap, 'Activo');
    const liabilities = this.buildAccountCategories(accounts, balanceMap, 'Pasivo');
    const equity = this.buildAccountCategories(accounts, balanceMap, 'Capital');

    const totalAssets = assets.reduce((sum, cat) => sum + cat.subtotal, 0);
    const totalLiabilities = liabilities.reduce((sum, cat) => sum + cat.subtotal, 0);
    const totalEquity = equity.reduce((sum, cat) => sum + cat.subtotal, 0);
    const difference = Math.abs(totalAssets - (totalLiabilities + totalEquity));

    return {
      assets, liabilities, equity,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      isBalanced: difference < 0.01,
      difference: Math.round(difference * 100) / 100,
    };
  }

  /**
   * Get income statement summary
   */
  async getIncomeStatementSummary(startDate: Date, endDate: Date): Promise<IIncomeStatementSummaryStats> {
    const incomeTypes: AccountType[] = ['Ingresos', 'Costos', 'Gastos'];

    const balances = await prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      _sum: { debitAmount: true, creditAmount: true },
      where: {
        journalEntry: { entryDate: { gte: startDate, lte: endDate }, isPosted: true, isReversed: false },
        account: { type: { in: incomeTypes }, isActive: true },
      },
    });

    const balanceMap = new Map(
      balances.map(b => [b.accountId, {
        debit: Number(b._sum.debitAmount ?? 0),
        credit: Number(b._sum.creditAmount ?? 0),
      }])
    );

    const accounts = await prisma.account.findMany({
      where: { type: { in: incomeTypes }, isActive: true },
      select: { id: true, accountNumber: true, name: true, type: true, isDetail: true, parentAccountId: true },
      orderBy: { accountNumber: 'asc' },
    });

    const revenue = this.buildAccountCategories(accounts, balanceMap, 'Ingresos');
    const costs = this.buildAccountCategories(accounts, balanceMap, 'Costos');
    const operatingExpenses = this.buildAccountCategories(accounts, balanceMap, 'Gastos');

    const totalRevenue = revenue.reduce((sum, cat) => sum + cat.subtotal, 0);
    const totalCosts = costs.reduce((sum, cat) => sum + cat.subtotal, 0);
    const totalOperatingExpenses = operatingExpenses.reduce((sum, cat) => sum + cat.subtotal, 0);
    const grossProfit = totalRevenue - totalCosts;
    const netIncome = grossProfit - totalOperatingExpenses;

    return {
      revenue, costs, operatingExpenses,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      isProfit: netIncome >= 0,
    };
  }

  /**
   * Get trial balance summary
   */
  async getTrialBalanceSummary(startDate: Date, endDate: Date): Promise<ITrialBalanceSummaryStats> {
    const balances = await prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      _sum: { debitAmount: true, creditAmount: true },
      where: {
        journalEntry: { entryDate: { gte: startDate, lte: endDate }, isPosted: true, isReversed: false },
        account: { isActive: true },
      },
    });

    const accountIds = balances.map(b => b.accountId);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, accountNumber: true, name: true, type: true },
      orderBy: { accountNumber: 'asc' },
    });

    const accountMap = new Map(accounts.map(a => [a.id, a]));

    const trialBalanceAccounts: ITrialBalanceAccountStats[] = [];
    let totalDebits = 0, totalCredits = 0;

    for (const balance of balances) {
      const account = accountMap.get(balance.accountId);
      if (!account) continue;

      const debit = Number(balance._sum.debitAmount ?? 0);
      const credit = Number(balance._sum.creditAmount ?? 0);
      totalDebits += debit;
      totalCredits += credit;

      trialBalanceAccounts.push({
        accountId: account.id,
        accountNumber: account.accountNumber,
        accountName: account.name,
        accountType: account.type,
        debitBalance: Math.round(debit * 100) / 100,
        creditBalance: Math.round(credit * 100) / 100,
      });
    }

    trialBalanceAccounts.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
    const difference = Math.abs(totalDebits - totalCredits);

    return {
      accounts: trialBalanceAccounts,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      isBalanced: difference < 0.01,
      difference: Math.round(difference * 100) / 100,
    };
  }

  /**
   * Build account categories for a specific account type
   */
  private buildAccountCategories(
    accounts: Array<{ id: number; accountNumber: string; name: string; type: AccountType; isDetail: boolean; parentAccountId: number | null }>,
    balanceMap: Map<number, { debit: number; credit: number }>,
    accountType: AccountType
  ): IAccountCategorySummary[] {
    const typeAccounts = accounts.filter(a => a.type === accountType);
    const debitNature = isDebitNature(accountType);
    const parentAccounts = typeAccounts.filter(a => !a.parentAccountId || !typeAccounts.some(p => p.id === a.parentAccountId));

    const categories: IAccountCategorySummary[] = [];

    for (const parent of parentAccounts) {
      const childAccounts = typeAccounts.filter(a => a.parentAccountId === parent.id || a.id === parent.id);
      const accountBalances: IAccountBalanceStats[] = [];
      let subtotal = 0;

      for (const account of childAccounts) {
        const balance = balanceMap.get(account.id) ?? { debit: 0, credit: 0 };
        const netBalance = debitNature ? balance.debit - balance.credit : balance.credit - balance.debit;
        const displayBalance = Math.abs(netBalance);

        if (account.isDetail) subtotal += displayBalance;

        accountBalances.push({
          accountId: account.id,
          accountNumber: account.accountNumber,
          accountName: account.name,
          accountType: account.type,
          balance: Math.round(displayBalance * 100) / 100,
          isDetail: account.isDetail,
        });
      }

      if (accountBalances.length > 0) {
        categories.push({ categoryName: parent.name, accounts: accountBalances, subtotal: Math.round(subtotal * 100) / 100 });
      }
    }

    return categories;
  }
}
