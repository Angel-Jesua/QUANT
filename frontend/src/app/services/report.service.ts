import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Single account entry in the Trial Balance report
 */
export interface TrialBalanceEntry {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  accountLevel: number;
  isDetail: boolean;
  parentAccountId?: number;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  balanceType: 'debit' | 'credit';
}

/**
 * Summary of the Trial Balance report
 */
export interface TrialBalanceSummary {
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
  accountCount: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Complete Trial Balance report response
 */
export interface TrialBalanceResponse {
  success: boolean;
  data: {
    entries: TrialBalanceEntry[];
    summary: TrialBalanceSummary;
    generatedAt: string;
    generatedBy?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Query parameters for Trial Balance report
 */
export interface TrialBalanceQuery {
  startDate: string;
  endDate: string;
  accountLevel?: number;
  includeInactive?: boolean;
  onlyWithMovements?: boolean;
}

/**
 * Journal date range response
 */
export interface DateRangeResponse {
  success: boolean;
  data: {
    minDate: string | null;
    maxDate: string | null;
  };
}

/**
 * Account levels response
 */
export interface AccountLevelsResponse {
  success: boolean;
  data: {
    levels: number[];
  };
}

// ============================================
// BALANCE SHEET (BALANCE GENERAL) TYPES
// ============================================

export type BalanceSheetSection = 'assets' | 'liabilities' | 'equity';

/**
 * Single account entry in the Balance Sheet
 */
export interface BalanceSheetEntry {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  accountLevel: number;
  isDetail: boolean;
  parentAccountId?: number;
  section: BalanceSheetSection;
  balance: number;
  balanceType: 'debit' | 'credit';
  // Comparison fields
  previousBalance?: number;
  previousBalanceType?: 'debit' | 'credit';
  variance?: number;
  variancePercentage?: number;
  // UI state
  isExpanded?: boolean;
  children?: BalanceSheetEntry[];
}

/**
 * Section totals for Balance Sheet
 */
export interface BalanceSheetSectionTotals {
  section: BalanceSheetSection;
  sectionName: string;
  total: number;
  previousTotal?: number;
  variance?: number;
  variancePercentage?: number;
  accountCount: number;
}

/**
 * Balance Sheet summary
 */
export interface BalanceSheetSummary {
  asOfDate: string;
  compareDate?: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  difference: number;
  // Previous period
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
 * Balance Sheet response
 */
export interface BalanceSheetResponse {
  success: boolean;
  data: {
    entries: BalanceSheetEntry[];
    sections: BalanceSheetSectionTotals[];
    summary: BalanceSheetSummary;
    generatedAt: string;
    generatedBy?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Balance Sheet query parameters
 */
export interface BalanceSheetQuery {
  asOfDate: string;
  compareDate?: string;
  includeInactive?: boolean;
  showZeroBalances?: boolean;
}

/**
 * Account movement for drill-down
 */
export interface AccountMovement {
  journalEntryId: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  isPosted: boolean;
}

/**
 * Account movements query
 */
export interface AccountMovementsQuery {
  accountId: number;
  startDate: string;
  endDate: string;
}

/**
 * Account movements response
 */
export interface AccountMovementsResponse {
  success: boolean;
  data: {
    account: {
      id: number;
      accountNumber: string;
      name: string;
      type: string;
    };
    openingBalance: number;
    movements: AccountMovement[];
    closingBalance: number;
    totalDebits: number;
    totalCredits: number;
    periodStart: string;
    periodEnd: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// INCOME STATEMENT (ESTADO DE RESULTADOS) TYPES
// ============================================

export type IncomeStatementCategory = 'revenue' | 'costs' | 'operating_expenses';

/**
 * Single account entry in the Income Statement
 */
export interface IncomeStatementEntry {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  accountLevel: number;
  isDetail: boolean;
  parentAccountId?: number;
  category: IncomeStatementCategory;
  amount: number;
  amountType: 'debit' | 'credit';
  // Comparison fields
  previousAmount?: number;
  previousAmountType?: 'debit' | 'credit';
  variance?: number;
  variancePercentage?: number;
  // UI state
  isExpanded?: boolean;
  children?: IncomeStatementEntry[];
}

/**
 * Category totals for Income Statement
 */
export interface IncomeStatementCategoryTotals {
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
 * Income Statement summary with profit/loss calculations
 */
export interface IncomeStatementSummary {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  // Current period
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  // Profit margins
  grossProfitMargin: number;
  operatingMargin: number;
  netProfitMargin: number;
  // Previous period
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
 * Income Statement response
 */
export interface IncomeStatementResponse {
  success: boolean;
  data: {
    entries: IncomeStatementEntry[];
    categories: IncomeStatementCategoryTotals[];
    summary: IncomeStatementSummary;
    generatedAt: string;
    generatedBy?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Income Statement query parameters
 */
export interface IncomeStatementQuery {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  includeInactive?: boolean;
  showZeroBalances?: boolean;
  groupByCategory?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://localhost:3000/api/reports';

  constructor(private http: HttpClient) { }

  /**
   * Get Trial Balance (Balanza de Comprobación) report
   */
  getTrialBalance(query: TrialBalanceQuery): Observable<TrialBalanceResponse> {
    let params = new HttpParams()
      .set('startDate', query.startDate)
      .set('endDate', query.endDate);

    if (query.accountLevel !== undefined && query.accountLevel !== null) {
      params = params.set('accountLevel', query.accountLevel.toString());
    }

    if (query.includeInactive !== undefined) {
      params = params.set('includeInactive', query.includeInactive.toString());
    }

    if (query.onlyWithMovements !== undefined) {
      params = params.set('onlyWithMovements', query.onlyWithMovements.toString());
    }

    return this.http.get<TrialBalanceResponse>(`${this.apiUrl}/trial-balance`, { params });
  }

  /**
   * Get Balance Sheet (Balance General) report
   */
  getBalanceSheet(query: BalanceSheetQuery): Observable<BalanceSheetResponse> {
    let params = new HttpParams()
      .set('asOfDate', query.asOfDate);

    if (query.compareDate) {
      params = params.set('compareDate', query.compareDate);
    }

    if (query.includeInactive !== undefined) {
      params = params.set('includeInactive', query.includeInactive.toString());
    }

    if (query.showZeroBalances !== undefined) {
      params = params.set('showZeroBalances', query.showZeroBalances.toString());
    }

    return this.http.get<BalanceSheetResponse>(`${this.apiUrl}/balance-sheet`, { params });
  }

  /**
   * Get account movements (drill-down)
   */
  getAccountMovements(query: AccountMovementsQuery): Observable<AccountMovementsResponse> {
    const params = new HttpParams()
      .set('accountId', query.accountId.toString())
      .set('startDate', query.startDate)
      .set('endDate', query.endDate);

    return this.http.get<AccountMovementsResponse>(`${this.apiUrl}/account-movements`, { params });
  }

  /**
   * Get the available date range from journal entries
   */
  getJournalDateRange(): Observable<DateRangeResponse> {
    return this.http.get<DateRangeResponse>(`${this.apiUrl}/journal-date-range`);
  }

  /**
   * Get available account hierarchy levels
   */
  getAccountLevels(): Observable<AccountLevelsResponse> {
    return this.http.get<AccountLevelsResponse>(`${this.apiUrl}/account-levels`);
  }

  /**
   * Get Income Statement (Estado de Resultados) report
   */
  getIncomeStatement(query: IncomeStatementQuery): Observable<IncomeStatementResponse> {
    let params = new HttpParams()
      .set('startDate', query.startDate)
      .set('endDate', query.endDate);

    if (query.compareStartDate) {
      params = params.set('compareStartDate', query.compareStartDate);
    }

    if (query.compareEndDate) {
      params = params.set('compareEndDate', query.compareEndDate);
    }

    if (query.includeInactive !== undefined) {
      params = params.set('includeInactive', query.includeInactive.toString());
    }

    if (query.showZeroBalances !== undefined) {
      params = params.set('showZeroBalances', query.showZeroBalances.toString());
    }

    if (query.groupByCategory !== undefined) {
      params = params.set('groupByCategory', query.groupByCategory.toString());
    }

    return this.http.get<IncomeStatementResponse>(`${this.apiUrl}/income-statement`, { params });
  }
}
