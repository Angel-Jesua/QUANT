// Report module type definitions
// Types for financial reports including Trial Balance (Balanza de Comprobación)

import { AccountType } from '@prisma/client';

/**
 * Query parameters for Trial Balance report
 */
export interface ITrialBalanceQuery {
  startDate: string;      // ISO date string (YYYY-MM-DD)
  endDate: string;        // ISO date string (YYYY-MM-DD)
  accountLevel?: number;  // Filter by account level (based on accountNumber depth)
  includeInactive?: boolean; // Include inactive accounts (default: false)
  onlyWithMovements?: boolean; // Only show accounts with movements (default: true)
}

/**
 * Single account entry in the Trial Balance report
 */
export interface ITrialBalanceEntry {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountLevel: number;      // Calculated from accountNumber structure
  isDetail: boolean;
  parentAccountId?: number;
  debitAmount: number;       // Sum of debits for the period
  creditAmount: number;      // Sum of credits for the period
  balance: number;           // Net balance (depends on account nature)
  balanceType: 'debit' | 'credit'; // Whether balance is debit or credit nature
}

/**
 * Complete Trial Balance report response
 */
export interface ITrialBalanceResponse {
  success: boolean;
  data: {
    entries: ITrialBalanceEntry[];
    summary: {
      totalDebits: number;
      totalCredits: number;
      difference: number;      // Should be 0 if balanced
      isBalanced: boolean;     // totalDebits === totalCredits
      accountCount: number;
      periodStart: string;
      periodEnd: string;
    };
    generatedAt: string;       // ISO timestamp
    generatedBy?: number;      // User ID who generated the report
  };
}

/**
 * Request context for report generation
 */
export interface IReportRequestContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: number;
}

/**
 * Account balance calculation result (internal use)
 */
export interface IAccountBalance {
  accountId: number;
  debitSum: number;
  creditSum: number;
}

/**
 * Account nature mapping - determines how balance is calculated
 * Debit nature: Activo, Gastos, Costos (balance = debits - credits)
 * Credit nature: Pasivo, Capital, Ingresos (balance = credits - debits)
 */
export const DEBIT_NATURE_TYPES: readonly AccountType[] = [
  'Activo',
  'Gastos',
  'Costos',
] as const;

export const CREDIT_NATURE_TYPES: readonly AccountType[] = [
  'Pasivo',
  'Capital',
  'Ingresos',
] as const;

/**
 * Determines if an account type has debit nature
 */
export function isDebitNature(type: AccountType): boolean {
  return DEBIT_NATURE_TYPES.includes(type);
}

/**
 * Determines if an account type has credit nature
 */
export function isCreditNature(type: AccountType): boolean {
  return CREDIT_NATURE_TYPES.includes(type);
}

/**
 * Calculate account level from account number
 * Assumes account numbers use dot notation (e.g., "1", "1.1", "1.1.01")
 * Or digit-length based hierarchy (e.g., "1" = level 1, "11" = level 2, "1101" = level 3)
 */
export function calculateAccountLevel(accountNumber: string): number {
  // Check for dot notation first
  if (accountNumber.includes('.')) {
    return accountNumber.split('.').length;
  }
  
  // Check for dash notation
  if (accountNumber.includes('-')) {
    return accountNumber.split('-').length;
  }
  
  // Fallback to digit-length based hierarchy
  const len = accountNumber.replace(/\D/g, '').length;
  if (len <= 1) return 1;
  if (len <= 2) return 2;
  if (len <= 4) return 3;
  if (len <= 6) return 4;
  return 5;
}

// ============================================
// BALANCE GENERAL (BALANCE SHEET) TYPES
// ============================================

/**
 * Query parameters for Balance General report
 */
export interface IBalanceSheetQuery {
  asOfDate: string;           // ISO date string (YYYY-MM-DD) - Balance date
  compareDate?: string;       // Optional comparison date for variance analysis
  costCenterId?: number;      // Filter by cost center (future)
  includeInactive?: boolean;  // Include inactive accounts (default: false)
  showZeroBalances?: boolean; // Show accounts with zero balance (default: false)
}

/**
 * Balance Sheet account classification
 */
export type BalanceSheetSection = 'assets' | 'liabilities' | 'equity';

/**
 * Single account entry in the Balance Sheet
 */
export interface IBalanceSheetEntry {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountLevel: number;
  isDetail: boolean;
  parentAccountId?: number;
  section: BalanceSheetSection;
  balance: number;              // Net balance as of date
  balanceType: 'debit' | 'credit';
  // Comparison fields (when compareDate provided)
  previousBalance?: number;
  previousBalanceType?: 'debit' | 'credit';
  variance?: number;            // Current - Previous
  variancePercentage?: number;  // ((Current - Previous) / Previous) * 100
  // Hierarchy
  children?: IBalanceSheetEntry[];
  isExpanded?: boolean;
}

/**
 * Section totals for Balance Sheet
 */
export interface IBalanceSheetSectionTotals {
  section: BalanceSheetSection;
  sectionName: string;
  total: number;
  previousTotal?: number;
  variance?: number;
  variancePercentage?: number;
  accountCount: number;
}

/**
 * Complete Balance Sheet summary
 */
export interface IBalanceSheetSummary {
  asOfDate: string;
  compareDate?: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;         // Assets === Liabilities + Equity
  difference: number;
  // Previous period (if compareDate provided)
  previousTotalAssets?: number;
  previousTotalLiabilities?: number;
  previousTotalEquity?: number;
  // Variances
  assetsVariance?: number;
  assetsVariancePercentage?: number;
  liabilitiesVariance?: number;
  liabilitiesVariancePercentage?: number;
  equityVariance?: number;
  equityVariancePercentage?: number;
  accountCount: number;
}

/**
 * Complete Balance Sheet report response
 */
export interface IBalanceSheetResponse {
  success: boolean;
  data: {
    entries: IBalanceSheetEntry[];
    sections: IBalanceSheetSectionTotals[];
    summary: IBalanceSheetSummary;
    generatedAt: string;
    generatedBy?: number;
  };
}

/**
 * Account movements for drill-down
 */
export interface IAccountMovement {
  journalEntryId: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;            // Running balance
  isPosted: boolean;
}

/**
 * Account movements query
 */
export interface IAccountMovementsQuery {
  accountId: number;
  startDate: string;
  endDate: string;
}

/**
 * Account movements response
 */
export interface IAccountMovementsResponse {
  success: boolean;
  data: {
    account: {
      id: number;
      accountNumber: string;
      name: string;
      type: AccountType;
    };
    openingBalance: number;
    movements: IAccountMovement[];
    closingBalance: number;
    totalDebits: number;
    totalCredits: number;
    periodStart: string;
    periodEnd: string;
  };
}

/**
 * Map AccountType to BalanceSheetSection
 */
export function getBalanceSheetSection(type: AccountType): BalanceSheetSection | null {
  switch (type) {
    case 'Activo':
      return 'assets';
    case 'Pasivo':
      return 'liabilities';
    case 'Capital':
      return 'equity';
    default:
      return null; // Income, Expense, Cost accounts don't appear in Balance Sheet
  }
}

/**
 * Get section display name
 */
export function getSectionDisplayName(section: BalanceSheetSection): string {
  const names: Record<BalanceSheetSection, string> = {
    assets: 'ACTIVOS',
    liabilities: 'PASIVOS',
    equity: 'PATRIMONIO',
  };
  return names[section];
}

// ============================================
// ESTADO DE RESULTADOS (INCOME STATEMENT) TYPES
// ============================================

/**
 * Query parameters for Income Statement report
 */
export interface IIncomeStatementQuery {
  startDate: string;          // ISO date string (YYYY-MM-DD) - Period start
  endDate: string;            // ISO date string (YYYY-MM-DD) - Period end
  compareStartDate?: string;  // Optional comparison period start
  compareEndDate?: string;    // Optional comparison period end
  includeInactive?: boolean;  // Include inactive accounts (default: false)
  showZeroBalances?: boolean; // Show accounts with zero balance (default: false)
  groupByCategory?: boolean;  // Group by revenue/costs/expenses (default: true)
}

/**
 * Income Statement account classification
 */
export type IncomeStatementCategory = 'revenue' | 'costs' | 'operating_expenses';

/**
 * Single account entry in the Income Statement
 */
export interface IIncomeStatementEntry {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountLevel: number;
  isDetail: boolean;
  parentAccountId?: number;
  category: IncomeStatementCategory;
  amount: number;               // Net amount for the period
  amountType: 'debit' | 'credit';
  // Comparison fields (when comparison period provided)
  previousAmount?: number;
  previousAmountType?: 'debit' | 'credit';
  variance?: number;            // Current - Previous
  variancePercentage?: number;  // ((Current - Previous) / Previous) * 100
  // Hierarchy
  children?: IIncomeStatementEntry[];
  isExpanded?: boolean;
}

/**
 * Category totals for Income Statement
 */
export interface IIncomeStatementCategoryTotals {
  category: IncomeStatementCategory;
  categoryName: string;
  order: number;
  total: number;
  previousTotal?: number;
  variance?: number;
  variancePercentage?: number;
  accountCount: number;
}

/**
 * Complete Income Statement summary
 */
export interface IIncomeStatementSummary {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  // Current period
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;           // Revenue - Costs
  totalOperatingExpenses: number;
  operatingIncome: number;       // Gross Profit - Operating Expenses
  netIncome: number;             // Final profit/loss
  // Profit margins
  grossProfitMargin: number;     // (Gross Profit / Revenue) * 100
  operatingMargin: number;       // (Operating Income / Revenue) * 100
  netProfitMargin: number;       // (Net Income / Revenue) * 100
  // Previous period (if comparison provided)
  previousTotalRevenue?: number;
  previousTotalCosts?: number;
  previousGrossProfit?: number;
  previousTotalOperatingExpenses?: number;
  previousOperatingIncome?: number;
  previousNetIncome?: number;
  // Variances
  revenueVariance?: number;
  revenueVariancePercentage?: number;
  costsVariance?: number;
  costsVariancePercentage?: number;
  grossProfitVariance?: number;
  grossProfitVariancePercentage?: number;
  operatingExpensesVariance?: number;
  operatingExpensesVariancePercentage?: number;
  netIncomeVariance?: number;
  netIncomeVariancePercentage?: number;
  accountCount: number;
  isProfit: boolean;
}

/**
 * Complete Income Statement report response
 */
export interface IIncomeStatementResponse {
  success: boolean;
  data: {
    entries: IIncomeStatementEntry[];
    categories: IIncomeStatementCategoryTotals[];
    summary: IIncomeStatementSummary;
    generatedAt: string;
    generatedBy?: number;
  };
}

/**
 * Map AccountType to IncomeStatementCategory
 */
export function getIncomeStatementCategory(type: AccountType): IncomeStatementCategory | null {
  switch (type) {
    case 'Ingresos':
      return 'revenue';
    case 'Costos':
      return 'costs';
    case 'Gastos':
      return 'operating_expenses';
    default:
      return null; // Asset, Liability, Equity accounts don't appear in Income Statement
  }
}

/**
 * Get category display name (Spanish)
 */
export function getCategoryDisplayName(category: IncomeStatementCategory): string {
  const names: Record<IncomeStatementCategory, string> = {
    revenue: 'INGRESOS',
    costs: 'COSTOS DE VENTA',
    operating_expenses: 'GASTOS OPERATIVOS',
  };
  return names[category];
}

/**
 * Get category order for display
 */
export function getCategoryOrder(category: IncomeStatementCategory): number {
  const order: Record<IncomeStatementCategory, number> = {
    revenue: 1,
    costs: 2,
    operating_expenses: 3,
  };
  return order[category];
}
