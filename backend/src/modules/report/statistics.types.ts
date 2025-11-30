/**
 * Statistics Module Type Definitions
 * Types for financial statistics, KPIs, and AI predictions
 */

import { AccountType } from '@prisma/client';

// ============================================
// STATISTICS QUERY AND RESPONSE TYPES
// ============================================

/**
 * Query parameters for Statistics endpoint
 */
export interface IStatisticsQuery {
  startDate: string;  // ISO date string (YYYY-MM-DD)
  endDate: string;    // ISO date string (YYYY-MM-DD)
}

/**
 * Key Performance Indicators for financial statistics
 */
export interface IStatisticsKPIs {
  totalAssets: number;
  totalLiabilities: number;
  netEquity: number;
  periodRevenue: number;
  periodExpenses: number;
  netProfitLoss: number;
  isProfit: boolean;
}

/**
 * Balance Sheet summary for statistics
 */
export interface IBalanceSheetSummaryStats {
  assets: IAccountCategorySummary[];
  liabilities: IAccountCategorySummary[];
  equity: IAccountCategorySummary[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
  difference: number;
}

/**
 * Income Statement summary for statistics
 */
export interface IIncomeStatementSummaryStats {
  revenue: IAccountCategorySummary[];
  costs: IAccountCategorySummary[];
  operatingExpenses: IAccountCategorySummary[];
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  netIncome: number;
  isProfit: boolean;
}

/**
 * Trial Balance summary for statistics
 */
export interface ITrialBalanceSummaryStats {
  accounts: ITrialBalanceAccountStats[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

/**
 * Account category summary with subtotals
 */
export interface IAccountCategorySummary {
  categoryName: string;
  accounts: IAccountBalanceStats[];
  subtotal: number;
}

/**
 * Individual account balance for statistics
 */
export interface IAccountBalanceStats {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  balance: number;
  isDetail: boolean;
}

/**
 * Trial balance account entry
 */
export interface ITrialBalanceAccountStats {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
}

/**
 * Complete Statistics response
 */
export interface IStatisticsResponse {
  success: boolean;
  data: {
    kpis: IStatisticsKPIs;
    balanceSheet: IBalanceSheetSummaryStats;
    incomeStatement: IIncomeStatementSummaryStats;
    trialBalance: ITrialBalanceSummaryStats;
    charts: IChartDataSets;
    generatedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// PREDICTION TYPES
// ============================================

/**
 * Query parameters for Predictions endpoint
 */
export interface IPredictionQuery {
  baseDate: string;   // Date to project from (YYYY-MM-DD)
  months: number;     // Months of historical data to analyze (minimum 3)
}

/**
 * Monthly data point for historical data
 */
export interface IMonthlyDataPoint {
  month: string;      // Format: YYYY-MM
  value: number;
}

/**
 * Projected value with confidence bounds
 */
export interface IProjectedValue {
  month: string;      // Format: YYYY-MM
  value: number;
  lowerBound: number;
  upperBound: number;
}

/**
 * Projection set for a metric (revenue, costs, expenses)
 */
export interface IProjectionSet {
  historical: IMonthlyDataPoint[];
  projections: {
    threeMonths: IProjectedValue[];
    sixMonths: IProjectedValue[];
    twelveMonths: IProjectedValue[];
  };
  confidence: number; // 0-100 percentage
}

/**
 * Complete Predictions response
 */
export interface IPredictionResponse {
  success: boolean;
  data: {
    revenue: IProjectionSet;
    costs: IProjectionSet;
    expenses: IProjectionSet;
    hasInsufficientData: boolean;
    insufficientDataMessage?: string;
    generatedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// CHART DATA TYPES
// ============================================

/**
 * Income vs Expense monthly comparison data
 */
export interface IIncomeExpenseData {
  month: string;      // Format: YYYY-MM or month name
  income: number;
  expense: number;
}

/**
 * Category distribution for pie chart
 */
export interface ICategoryDistribution {
  category: string;
  amount: number;
  percentage: number;
  color?: string;
}

/**
 * Equity evolution data point
 */
export interface IEquityDataPoint {
  month: string;      // Format: YYYY-MM
  equity: number;
}

/**
 * Complete chart data sets
 */
export interface IChartDataSets {
  incomeVsExpense: IIncomeExpenseData[];
  expenseDistribution: ICategoryDistribution[];
  equityEvolution: IEquityDataPoint[];
}

// ============================================
// LINEAR REGRESSION TYPES
// ============================================

/**
 * Linear regression result
 */
export interface ILinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;   // Coefficient of determination (0-1)
}

/**
 * Moving average result
 */
export interface IMovingAverageResult {
  values: number[];
  window: number;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Minimum months of data required for predictions
 */
export const MIN_MONTHS_FOR_PREDICTION = 3;

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 30,
} as const;

/**
 * Validates if there's sufficient data for predictions
 */
export function hasInsufficientData(monthsOfData: number): boolean {
  return monthsOfData < MIN_MONTHS_FOR_PREDICTION;
}

/**
 * Get insufficient data message
 */
export function getInsufficientDataMessage(monthsOfData: number): string {
  return `Se requieren al menos ${MIN_MONTHS_FOR_PREDICTION} meses de datos históricos para generar predicciones. ` +
    `Actualmente hay ${monthsOfData} mes(es) de datos disponibles.`;
}

/**
 * Calculate confidence level description
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}
