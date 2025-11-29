import {
  ITrialBalanceQuery,
  ITrialBalanceResponse,
  IBalanceSheetQuery,
  IBalanceSheetResponse,
  IAccountMovementsQuery,
  IAccountMovementsResponse,
  IIncomeStatementQuery,
  IIncomeStatementResponse,
} from './report.types';
import {
  TrialBalanceService,
  BalanceSheetService,
  IncomeStatementService,
  AccountMovementsService,
  ReportUtilsService,
} from './services';

/**
 * Main Report Service - Facade pattern
 * Delegates to specialized services for each report type
 */
export class ReportService {
  private trialBalanceService: TrialBalanceService;
  private balanceSheetService: BalanceSheetService;
  private incomeStatementService: IncomeStatementService;
  private accountMovementsService: AccountMovementsService;
  private reportUtilsService: ReportUtilsService;

  constructor() {
    this.trialBalanceService = new TrialBalanceService();
    this.balanceSheetService = new BalanceSheetService();
    this.incomeStatementService = new IncomeStatementService();
    this.accountMovementsService = new AccountMovementsService();
    this.reportUtilsService = new ReportUtilsService();
  }

  // ============================================
  // TRIAL BALANCE (BALANZA DE COMPROBACIÓN)
  // ============================================

  /**
   * Generate Trial Balance (Balanza de Comprobación) report
   * Aggregates debits and credits from posted journal entries within a date range
   */
  async getTrialBalance(
    query: ITrialBalanceQuery,
    userId?: number
  ): Promise<ITrialBalanceResponse> {
    return this.trialBalanceService.getTrialBalance(query, userId);
  }

  // ============================================
  // BALANCE SHEET (BALANCE GENERAL)
  // ============================================

  /**
   * Generate Balance Sheet (Balance General) report
   * Shows financial position at a specific point in time
   */
  async getBalanceSheet(
    query: IBalanceSheetQuery,
    userId?: number
  ): Promise<IBalanceSheetResponse> {
    return this.balanceSheetService.getBalanceSheet(query, userId);
  }

  // ============================================
  // INCOME STATEMENT (ESTADO DE RESULTADOS)
  // ============================================

  /**
   * Generate Income Statement (Estado de Resultados) report
   * Shows financial performance over a period of time
   */
  async getIncomeStatement(
    query: IIncomeStatementQuery,
    userId?: number
  ): Promise<IIncomeStatementResponse> {
    return this.incomeStatementService.getIncomeStatement(query, userId);
  }

  // ============================================
  // ACCOUNT MOVEMENTS (MOVIMIENTOS DE CUENTA)
  // ============================================

  /**
   * Get detailed movements for a specific account
   * Used for drill-down functionality
   */
  async getAccountMovements(
    query: IAccountMovementsQuery,
    userId?: number
  ): Promise<IAccountMovementsResponse> {
    return this.accountMovementsService.getAccountMovements(query, userId);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get available date range for journal entries
   * Useful for UI to show valid date picker boundaries
   */
  async getJournalDateRange(): Promise<{
    minDate: string | null;
    maxDate: string | null;
  }> {
    return this.reportUtilsService.getJournalDateRange();
  }

  /**
   * Get account hierarchy levels present in the system
   * Useful for populating account level filter dropdown
   */
  async getAccountLevels(): Promise<number[]> {
    return this.reportUtilsService.getAccountLevels();
  }
}
