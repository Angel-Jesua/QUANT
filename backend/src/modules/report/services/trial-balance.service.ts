import { PrismaClient, Prisma } from '@prisma/client';
import {
  ITrialBalanceQuery,
  ITrialBalanceEntry,
  ITrialBalanceResponse,
  IAccountBalance,
  isDebitNature,
  calculateAccountLevel,
} from '../report.types';

const prisma = new PrismaClient();

/**
 * Service for Trial Balance (Balanza de Comprobación) report generation
 */
export class TrialBalanceService {
  /**
   * Generate Trial Balance (Balanza de Comprobación) report
   * Aggregates debits and credits from posted journal entries within a date range
   */
  async getTrialBalance(
    query: ITrialBalanceQuery,
    userId?: number
  ): Promise<ITrialBalanceResponse> {
    const {
      startDate,
      endDate,
      accountLevel,
      includeInactive = false,
      onlyWithMovements = true,
    } = query;

    // Parse dates
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    
    // Validate date range
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new Error('INVALID_DATE_FORMAT');
    }
    if (periodStart > periodEnd) {
      throw new Error('INVALID_DATE_RANGE');
    }

    // Aggregate journal entry lines by account for the period
    // Only include posted entries
    const balances = await prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
      where: {
        journalEntry: {
          entryDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          isPosted: true,
          isReversed: false,
        },
      },
    });

    // Create a map of account balances
    const balanceMap = new Map<number, IAccountBalance>();
    for (const row of balances) {
      balanceMap.set(row.accountId, {
        accountId: row.accountId,
        debitSum: Number(row._sum.debitAmount ?? 0),
        creditSum: Number(row._sum.creditAmount ?? 0),
      });
    }

    // Get all accounts (or only those with movements)
    const accountIds = Array.from(balanceMap.keys());
    
    const accountWhere: Prisma.AccountWhereInput = {};
    
    if (onlyWithMovements && accountIds.length > 0) {
      accountWhere.id = { in: accountIds };
    }
    
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

    // Build trial balance entries
    const entries: ITrialBalanceEntry[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const level = calculateAccountLevel(account.accountNumber);
      
      // Apply account level filter if specified
      if (accountLevel !== undefined && level !== accountLevel) {
        continue;
      }

      const balance = balanceMap.get(account.id) ?? {
        accountId: account.id,
        debitSum: 0,
        creditSum: 0,
      };

      const debitAmount = balance.debitSum;
      const creditAmount = balance.creditSum;

      // Skip accounts with no movements if onlyWithMovements is true
      if (onlyWithMovements && debitAmount === 0 && creditAmount === 0) {
        continue;
      }

      // Calculate net balance based on account nature
      // Debit nature accounts: balance = debits - credits (positive = debit balance)
      // Credit nature accounts: balance = credits - debits (positive = credit balance)
      const debitNature = isDebitNature(account.type);
      let netBalance: number;
      let balanceType: 'debit' | 'credit';

      if (debitNature) {
        netBalance = debitAmount - creditAmount;
        balanceType = netBalance >= 0 ? 'debit' : 'credit';
      } else {
        netBalance = creditAmount - debitAmount;
        balanceType = netBalance >= 0 ? 'credit' : 'debit';
      }

      entries.push({
        accountId: account.id,
        accountNumber: account.accountNumber,
        accountName: account.name,
        accountType: account.type,
        accountLevel: level,
        isDetail: account.isDetail,
        parentAccountId: account.parentAccountId ?? undefined,
        debitAmount,
        creditAmount,
        balance: Math.abs(netBalance),
        balanceType,
      });

      totalDebits += debitAmount;
      totalCredits += creditAmount;
    }

    const difference = Math.abs(totalDebits - totalCredits);
    // Use small epsilon for floating point comparison
    const isBalanced = difference < 0.01;

    return {
      success: true,
      data: {
        entries,
        summary: {
          totalDebits: Math.round(totalDebits * 100) / 100,
          totalCredits: Math.round(totalCredits * 100) / 100,
          difference: Math.round(difference * 100) / 100,
          isBalanced,
          accountCount: entries.length,
          periodStart: startDate,
          periodEnd: endDate,
        },
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
      },
    };
  }
}
