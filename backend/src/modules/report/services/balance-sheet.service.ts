import { PrismaClient, AccountType, Prisma } from '@prisma/client';
import {
  IBalanceSheetQuery,
  IBalanceSheetEntry,
  IBalanceSheetResponse,
  IBalanceSheetSectionTotals,
  IBalanceSheetSummary,
  BalanceSheetSection,
  getBalanceSheetSection,
  getSectionDisplayName,
  isDebitNature,
  calculateAccountLevel,
} from '../report.types';

const prisma = new PrismaClient();

/**
 * Service for Balance Sheet (Balance General) report generation
 */
export class BalanceSheetService {
  /**
   * Calculate account balances up to a specific date
   * This is the core function for Balance Sheet calculations
   */
  async calculateBalancesAsOfDate(
    asOfDate: Date,
    accountTypes: AccountType[],
    includeInactive: boolean = false
  ): Promise<Map<number, { debitSum: number; creditSum: number }>> {
    // Aggregate all journal entry lines up to the specified date
    const balances = await prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
      where: {
        journalEntry: {
          entryDate: {
            lte: asOfDate,
          },
          isPosted: true,
          isReversed: false,
        },
        account: {
          type: { in: accountTypes },
          ...(includeInactive ? {} : { isActive: true }),
        },
      },
    });

    const balanceMap = new Map<number, { debitSum: number; creditSum: number }>();
    for (const row of balances) {
      balanceMap.set(row.accountId, {
        debitSum: Number(row._sum.debitAmount ?? 0),
        creditSum: Number(row._sum.creditAmount ?? 0),
      });
    }

    return balanceMap;
  }

  /**
   * Generate Balance Sheet (Balance General) report
   * Shows financial position at a specific point in time
   */
  async getBalanceSheet(
    query: IBalanceSheetQuery,
    userId?: number
  ): Promise<IBalanceSheetResponse> {
    const {
      asOfDate,
      compareDate,
      includeInactive = false,
      showZeroBalances = false,
    } = query;

    // Parse dates
    const reportDate = new Date(asOfDate);
    const comparisonDate = compareDate ? new Date(compareDate) : null;

    // Validate dates
    if (isNaN(reportDate.getTime())) {
      throw new Error('INVALID_DATE_FORMAT');
    }
    if (comparisonDate && isNaN(comparisonDate.getTime())) {
      throw new Error('INVALID_COMPARISON_DATE_FORMAT');
    }

    // Balance Sheet only includes: Activo, Pasivo, Capital
    const balanceSheetTypes: AccountType[] = ['Activo', 'Pasivo', 'Capital'];

    // Calculate current balances
    const currentBalances = await this.calculateBalancesAsOfDate(
      reportDate,
      balanceSheetTypes,
      includeInactive
    );

    // Calculate previous balances if comparison date provided
    let previousBalances: Map<number, { debitSum: number; creditSum: number }> | null = null;
    if (comparisonDate) {
      previousBalances = await this.calculateBalancesAsOfDate(
        comparisonDate,
        balanceSheetTypes,
        includeInactive
      );
    }

    // Get all relevant accounts
    const accountWhere: Prisma.AccountWhereInput = {
      type: { in: balanceSheetTypes },
    };
    if (!includeInactive) {
      accountWhere.isActive = true;
    }

    const accounts = await prisma.account.findMany({
      where: accountWhere,
      select: {
        id: true,
        accountNumber: true,
        name: true,
        type: true,
        isDetail: true,
        parentAccountId: true,
        isActive: true,
      },
      orderBy: {
        accountNumber: 'asc',
      },
    });

    // Build Balance Sheet entries
    const entries: IBalanceSheetEntry[] = [];
    const sectionTotals: Record<BalanceSheetSection, { total: number; previousTotal: number; count: number }> = {
      assets: { total: 0, previousTotal: 0, count: 0 },
      liabilities: { total: 0, previousTotal: 0, count: 0 },
      equity: { total: 0, previousTotal: 0, count: 0 },
    };

    for (const account of accounts) {
      const section = getBalanceSheetSection(account.type);
      if (!section) continue;

      const level = calculateAccountLevel(account.accountNumber);
      const balance = currentBalances.get(account.id) ?? { debitSum: 0, creditSum: 0 };
      const debitNature = isDebitNature(account.type);

      // Calculate net balance
      let netBalance: number;
      let balanceType: 'debit' | 'credit';

      if (debitNature) {
        netBalance = balance.debitSum - balance.creditSum;
        balanceType = netBalance >= 0 ? 'debit' : 'credit';
      } else {
        netBalance = balance.creditSum - balance.debitSum;
        balanceType = netBalance >= 0 ? 'credit' : 'debit';
      }

      // For Balance Sheet display, we want absolute values with proper sign
      // Assets show positive values
      // Liabilities and Equity also show positive values (they increase on credit)
      const displayBalance = Math.abs(netBalance);

      // Skip zero balances if not requested
      if (!showZeroBalances && displayBalance === 0) {
        continue;
      }

      // Calculate previous balance if comparison date exists
      let previousBalance: number | undefined;
      let previousBalanceType: 'debit' | 'credit' | undefined;
      let variance: number | undefined;
      let variancePercentage: number | undefined;

      if (previousBalances) {
        const prevBal = previousBalances.get(account.id) ?? { debitSum: 0, creditSum: 0 };
        let prevNetBalance: number;

        if (debitNature) {
          prevNetBalance = prevBal.debitSum - prevBal.creditSum;
          previousBalanceType = prevNetBalance >= 0 ? 'debit' : 'credit';
        } else {
          prevNetBalance = prevBal.creditSum - prevBal.debitSum;
          previousBalanceType = prevNetBalance >= 0 ? 'credit' : 'debit';
        }

        previousBalance = Math.abs(prevNetBalance);
        variance = displayBalance - previousBalance;
        
        if (previousBalance !== 0) {
          variancePercentage = Math.round(((displayBalance - previousBalance) / previousBalance) * 10000) / 100;
        } else if (displayBalance !== 0) {
          variancePercentage = 100; // New balance from zero
        } else {
          variancePercentage = 0;
        }
      }

      entries.push({
        accountId: account.id,
        accountNumber: account.accountNumber,
        accountName: account.name,
        accountType: account.type,
        accountLevel: level,
        isDetail: account.isDetail,
        parentAccountId: account.parentAccountId ?? undefined,
        section,
        balance: displayBalance,
        balanceType,
        previousBalance,
        previousBalanceType,
        variance,
        variancePercentage,
      });

      // Update section totals (only for detail accounts to avoid double-counting)
      if (account.isDetail) {
        sectionTotals[section].total += displayBalance;
        sectionTotals[section].count++;
        if (previousBalance !== undefined) {
          sectionTotals[section].previousTotal += previousBalance;
        }
      }
    }

    // Build section totals array
    const sections: IBalanceSheetSectionTotals[] = Object.entries(sectionTotals).map(([key, value]) => {
      const section = key as BalanceSheetSection;
      const totals: IBalanceSheetSectionTotals = {
        section,
        sectionName: getSectionDisplayName(section),
        total: Math.round(value.total * 100) / 100,
        accountCount: value.count,
      };

      if (previousBalances) {
        totals.previousTotal = Math.round(value.previousTotal * 100) / 100;
        totals.variance = Math.round((value.total - value.previousTotal) * 100) / 100;
        if (value.previousTotal !== 0) {
          totals.variancePercentage = Math.round(((value.total - value.previousTotal) / value.previousTotal) * 10000) / 100;
        } else if (value.total !== 0) {
          totals.variancePercentage = 100;
        } else {
          totals.variancePercentage = 0;
        }
      }

      return totals;
    });

    // Build summary
    const totalAssets = Math.round(sectionTotals.assets.total * 100) / 100;
    const totalLiabilities = Math.round(sectionTotals.liabilities.total * 100) / 100;
    const totalEquity = Math.round(sectionTotals.equity.total * 100) / 100;
    const totalLiabilitiesAndEquity = Math.round((totalLiabilities + totalEquity) * 100) / 100;
    const difference = Math.round(Math.abs(totalAssets - totalLiabilitiesAndEquity) * 100) / 100;
    const isBalanced = difference < 0.01;

    const summary: IBalanceSheetSummary = {
      asOfDate,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
      difference,
      accountCount: entries.length,
    };

    // Add comparison data to summary if available
    if (previousBalances) {
      summary.compareDate = compareDate;
      summary.previousTotalAssets = Math.round(sectionTotals.assets.previousTotal * 100) / 100;
      summary.previousTotalLiabilities = Math.round(sectionTotals.liabilities.previousTotal * 100) / 100;
      summary.previousTotalEquity = Math.round(sectionTotals.equity.previousTotal * 100) / 100;
      
      summary.assetsVariance = Math.round((totalAssets - summary.previousTotalAssets) * 100) / 100;
      summary.liabilitiesVariance = Math.round((totalLiabilities - summary.previousTotalLiabilities) * 100) / 100;
      summary.equityVariance = Math.round((totalEquity - summary.previousTotalEquity) * 100) / 100;

      if (summary.previousTotalAssets !== 0) {
        summary.assetsVariancePercentage = Math.round((summary.assetsVariance / summary.previousTotalAssets) * 10000) / 100;
      }
      if (summary.previousTotalLiabilities !== 0) {
        summary.liabilitiesVariancePercentage = Math.round((summary.liabilitiesVariance / summary.previousTotalLiabilities) * 10000) / 100;
      }
      if (summary.previousTotalEquity !== 0) {
        summary.equityVariancePercentage = Math.round((summary.equityVariance / summary.previousTotalEquity) * 10000) / 100;
      }
    }

    return {
      success: true,
      data: {
        entries,
        sections,
        summary,
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
      },
    };
  }
}
