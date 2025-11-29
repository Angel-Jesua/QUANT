import { PrismaClient } from '@prisma/client';
import {
  IAccountMovementsQuery,
  IAccountMovementsResponse,
  IAccountMovement,
  isDebitNature,
} from '../report.types';

const prisma = new PrismaClient();

/**
 * Service for Account Movements (Movimientos de Cuenta) report generation
 * Used for drill-down functionality in reports
 */
export class AccountMovementsService {
  /**
   * Get detailed movements for a specific account
   * Used for drill-down functionality
   */
  async getAccountMovements(
    query: IAccountMovementsQuery,
    userId?: number
  ): Promise<IAccountMovementsResponse> {
    const { accountId, startDate, endDate } = query;

    // Parse dates
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);

    // Validate dates
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new Error('INVALID_DATE_FORMAT');
    }
    if (periodStart > periodEnd) {
      throw new Error('INVALID_DATE_RANGE');
    }

    // Get account info
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        accountNumber: true,
        name: true,
        type: true,
      },
    });

    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    // Calculate opening balance (all movements before start date)
    const openingBalanceResult = await prisma.journalEntryLine.aggregate({
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
      where: {
        accountId,
        journalEntry: {
          entryDate: { lt: periodStart },
          isPosted: true,
          isReversed: false,
        },
      },
    });

    const openingDebits = Number(openingBalanceResult._sum.debitAmount ?? 0);
    const openingCredits = Number(openingBalanceResult._sum.creditAmount ?? 0);
    const debitNature = isDebitNature(account.type);
    
    let openingBalance: number;
    if (debitNature) {
      openingBalance = openingDebits - openingCredits;
    } else {
      openingBalance = openingCredits - openingDebits;
    }

    // Get movements in the period
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        accountId,
        journalEntry: {
          entryDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          isPosted: true,
          isReversed: false,
        },
      },
      include: {
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            description: true,
            isPosted: true,
          },
        },
      },
      orderBy: [
        { journalEntry: { entryDate: 'asc' } },
        { journalEntry: { entryNumber: 'asc' } },
        { lineNumber: 'asc' },
      ],
    });

    // Build movements array with running balance
    let runningBalance = openingBalance;
    let totalDebits = 0;
    let totalCredits = 0;

    const movements: IAccountMovement[] = journalLines.map((line) => {
      const debit = Number(line.debitAmount ?? 0);
      const credit = Number(line.creditAmount ?? 0);
      
      totalDebits += debit;
      totalCredits += credit;

      // Update running balance based on account nature
      if (debitNature) {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      return {
        journalEntryId: line.journalEntry.id,
        entryNumber: line.journalEntry.entryNumber,
        entryDate: line.journalEntry.entryDate.toISOString().split('T')[0],
        description: line.description || line.journalEntry.description,
        debitAmount: debit,
        creditAmount: credit,
        balance: Math.round(runningBalance * 100) / 100,
        isPosted: line.journalEntry.isPosted,
      };
    });

    const closingBalance = Math.round(runningBalance * 100) / 100;

    return {
      success: true,
      data: {
        account: {
          id: account.id,
          accountNumber: account.accountNumber,
          name: account.name,
          type: account.type,
        },
        openingBalance: Math.round(openingBalance * 100) / 100,
        movements,
        closingBalance,
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalCredits: Math.round(totalCredits * 100) / 100,
        periodStart: startDate,
        periodEnd: endDate,
      },
    };
  }
}
