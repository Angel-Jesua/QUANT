import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// STATISTICS QUERY AND RESPONSE TYPES
// ============================================

/**
 * Query parameters for Statistics endpoint
 */
export interface StatisticsQuery {
  startDate: string;  // ISO date string (YYYY-MM-DD)
  endDate: string;    // ISO date string (YYYY-MM-DD)
}

/**
 * Key Performance Indicators for financial statistics
 */
export interface StatisticsKPIs {
  totalAssets: number;
  totalLiabilities: number;
  netEquity: number;
  periodRevenue: number;
  periodExpenses: number;
  netProfitLoss: number;
  isProfit: boolean;
}

/**
 * Account category summary with subtotals
 */
export interface AccountCategorySummary {
  categoryName: string;
  accounts: AccountBalanceStats[];
  subtotal: number;
}

/**
 * Individual account balance for statistics
 */
export interface AccountBalanceStats {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  balance: number;
  isDetail: boolean;
}

/**
 * Balance Sheet summary for statistics
 */
export interface BalanceSheetSummaryStats {
  assets: AccountCategorySummary[];
  liabilities: AccountCategorySummary[];
  equity: AccountCategorySummary[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
  difference: number;
}

/**
 * Income Statement summary for statistics
 */
export interface IncomeStatementSummaryStats {
  revenue: AccountCategorySummary[];
  costs: AccountCategorySummary[];
  operatingExpenses: AccountCategorySummary[];
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  netIncome: number;
  isProfit: boolean;
}

/**
 * Trial balance account entry
 */
export interface TrialBalanceAccountStats {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

/**
 * Trial Balance summary for statistics
 */
export interface TrialBalanceSummaryStats {
  accounts: TrialBalanceAccountStats[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

// ============================================
// CHART DATA TYPES
// ============================================

/**
 * Income vs Expense monthly comparison data
 */
export interface IncomeExpenseData {
  month: string;      // Format: YYYY-MM or month name
  income: number;
  expense: number;
}

/**
 * Category distribution for pie chart
 */
export interface CategoryDistribution {
  category: string;
  amount: number;
  percentage: number;
  color?: string;
}

/**
 * Equity evolution data point
 */
export interface EquityDataPoint {
  month: string;      // Format: YYYY-MM
  equity: number;
}

/**
 * Complete chart data sets
 */
export interface ChartDataSets {
  incomeVsExpense: IncomeExpenseData[];
  expenseDistribution: CategoryDistribution[];
  equityEvolution: EquityDataPoint[];
}

/**
 * Complete Statistics response
 */
export interface StatisticsResponse {
  success: boolean;
  data: {
    kpis: StatisticsKPIs;
    balanceSheet: BalanceSheetSummaryStats;
    incomeStatement: IncomeStatementSummaryStats;
    trialBalance: TrialBalanceSummaryStats;
    charts: ChartDataSets;
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
export interface PredictionQuery {
  baseDate: string;   // Date to project from (YYYY-MM-DD)
  months: number;     // Months of historical data to analyze (minimum 3)
}

/**
 * Monthly data point for historical data
 */
export interface MonthlyDataPoint {
  month: string;      // Format: YYYY-MM
  value: number;
}

/**
 * Projected value with confidence bounds
 */
export interface ProjectedValue {
  month: string;      // Format: YYYY-MM
  value: number;
  lowerBound: number;
  upperBound: number;
}

/**
 * Projection set for a metric (revenue, costs, expenses)
 */
export interface ProjectionSet {
  historical: MonthlyDataPoint[];
  projections: {
    threeMonths: ProjectedValue[];
    sixMonths: ProjectedValue[];
    twelveMonths: ProjectedValue[];
  };
  confidence: number; // 0-100 percentage
}

/**
 * Complete Predictions response
 */
export interface PredictionResponse {
  success: boolean;
  data: {
    revenue: ProjectionSet;
    costs: ProjectionSet;
    expenses: ProjectionSet;
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
// CONSTANTS AND HELPERS
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
 * Get confidence level description
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

/**
 * Get confidence level label in Spanish
 */
export function getConfidenceLevelLabel(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Baja';
  }
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private apiUrl = 'http://localhost:3000/api/reports';

  constructor(private http: HttpClient) { }

  /**
   * Get aggregated statistics for a date range
   * Includes KPIs, Balance Sheet, Income Statement, Trial Balance, and Chart data
   */
  getStatistics(query: StatisticsQuery): Observable<StatisticsResponse> {
    const params = new HttpParams()
      .set('startDate', query.startDate)
      .set('endDate', query.endDate);

    return this.http.get<StatisticsResponse>(`${this.apiUrl}/statistics`, { params });
  }

  /**
   * Get AI-powered predictions for future periods
   * Returns projections for revenue, costs, and expenses
   */
  getPredictions(query: PredictionQuery): Observable<PredictionResponse> {
    const params = new HttpParams()
      .set('baseDate', query.baseDate)
      .set('months', query.months.toString());

    return this.http.get<PredictionResponse>(`${this.apiUrl}/predictions`, { params });
  }
}
