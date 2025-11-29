"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const services_1 = require("./services");
/**
 * Main Report Service - Facade pattern
 * Delegates to specialized services for each report type
 */
class ReportService {
    constructor() {
        this.trialBalanceService = new services_1.TrialBalanceService();
        this.balanceSheetService = new services_1.BalanceSheetService();
        this.incomeStatementService = new services_1.IncomeStatementService();
        this.accountMovementsService = new services_1.AccountMovementsService();
        this.reportUtilsService = new services_1.ReportUtilsService();
    }
    // ============================================
    // TRIAL BALANCE (BALANZA DE COMPROBACIÓN)
    // ============================================
    /**
     * Generate Trial Balance (Balanza de Comprobación) report
     * Aggregates debits and credits from posted journal entries within a date range
     */
    async getTrialBalance(query, userId) {
        return this.trialBalanceService.getTrialBalance(query, userId);
    }
    // ============================================
    // BALANCE SHEET (BALANCE GENERAL)
    // ============================================
    /**
     * Generate Balance Sheet (Balance General) report
     * Shows financial position at a specific point in time
     */
    async getBalanceSheet(query, userId) {
        return this.balanceSheetService.getBalanceSheet(query, userId);
    }
    // ============================================
    // INCOME STATEMENT (ESTADO DE RESULTADOS)
    // ============================================
    /**
     * Generate Income Statement (Estado de Resultados) report
     * Shows financial performance over a period of time
     */
    async getIncomeStatement(query, userId) {
        return this.incomeStatementService.getIncomeStatement(query, userId);
    }
    // ============================================
    // ACCOUNT MOVEMENTS (MOVIMIENTOS DE CUENTA)
    // ============================================
    /**
     * Get detailed movements for a specific account
     * Used for drill-down functionality
     */
    async getAccountMovements(query, userId) {
        return this.accountMovementsService.getAccountMovements(query, userId);
    }
    // ============================================
    // UTILITY METHODS
    // ============================================
    /**
     * Get available date range for journal entries
     * Useful for UI to show valid date picker boundaries
     */
    async getJournalDateRange() {
        return this.reportUtilsService.getJournalDateRange();
    }
    /**
     * Get account hierarchy levels present in the system
     * Useful for populating account level filter dropdown
     */
    async getAccountLevels() {
        return this.reportUtilsService.getAccountLevels();
    }
}
exports.ReportService = ReportService;
