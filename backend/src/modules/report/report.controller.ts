import { Request, Response } from 'express';
import { ReportService } from './report.service';
import { ITrialBalanceQuery, IReportRequestContext, IBalanceSheetQuery, IAccountMovementsQuery, IIncomeStatementQuery } from './report.types';
import { logErrorContext } from '../../utils/error';

export class ReportController {
  private reportService = new ReportService();

  /**
   * GET /api/reports/trial-balance
   * Generate Trial Balance (Balanza de Comprobación) report
   * 
   * Query parameters:
   * - startDate (required): Start date in YYYY-MM-DD format
   * - endDate (required): End date in YYYY-MM-DD format
   * - accountLevel (optional): Filter by account hierarchy level (1-5)
   * - includeInactive (optional): Include inactive accounts (default: false)
   * - onlyWithMovements (optional): Only show accounts with movements (default: true)
   */
  async getTrialBalance(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, accountLevel, includeInactive, onlyWithMovements } = req.query;

      // Validate required parameters
      if (!startDate || typeof startDate !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_START_DATE',
            message: 'La fecha de inicio es requerida (formato: YYYY-MM-DD)',
          },
        });
        return;
      }

      if (!endDate || typeof endDate !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_END_DATE',
            message: 'La fecha de fin es requerida (formato: YYYY-MM-DD)',
          },
        });
        return;
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_START_DATE',
            message: 'La fecha de inicio debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      if (!dateRegex.test(endDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_END_DATE',
            message: 'La fecha de fin debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      // Parse optional parameters
      const query: ITrialBalanceQuery = {
        startDate,
        endDate,
        accountLevel: accountLevel ? parseInt(accountLevel as string, 10) : undefined,
        includeInactive: includeInactive === 'true',
        onlyWithMovements: onlyWithMovements !== 'false', // Default true
      };

      // Get user ID from authenticated request
      const userId = (req as any).user?.id;

      const result = await this.reportService.getTrialBalance(query, userId);
      res.status(200).json(result);
    } catch (error: any) {
      logErrorContext('ReportController.getTrialBalance', error, {
        query: req.query,
      });

      if (error.message === 'INVALID_DATE_FORMAT') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Formato de fecha inválido',
          },
        });
        return;
      }

      if (error.message === 'INVALID_DATE_RANGE') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno al generar la balanza de comprobación',
        },
      });
    }
  }

  /**
   * GET /api/reports/journal-date-range
   * Get the min and max dates of posted journal entries
   * Useful for UI date picker boundaries
   */
  async getJournalDateRange(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getJournalDateRange();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logErrorContext('ReportController.getJournalDateRange', error, {});
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al obtener el rango de fechas',
        },
      });
    }
  }

  /**
   * GET /api/reports/account-levels
   * Get available account hierarchy levels
   * Useful for populating account level filter dropdown
   */
  async getAccountLevels(req: Request, res: Response): Promise<void> {
    try {
      const levels = await this.reportService.getAccountLevels();
      res.status(200).json({
        success: true,
        data: { levels },
      });
    } catch (error: any) {
      logErrorContext('ReportController.getAccountLevels', error, {});
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al obtener los niveles de cuenta',
        },
      });
    }
  }

  /**
   * GET /api/reports/balance-sheet
   * Generate Balance Sheet (Balance General) report
   * 
   * Query parameters:
   * - asOfDate (required): Date for balance calculation in YYYY-MM-DD format
   * - compareDate (optional): Comparison date for variance analysis in YYYY-MM-DD format
   * - includeInactive (optional): Include inactive accounts (default: false)
   * - showZeroBalances (optional): Show accounts with zero balance (default: false)
   */
  async getBalanceSheet(req: Request, res: Response): Promise<void> {
    try {
      const { asOfDate, compareDate, includeInactive, showZeroBalances } = req.query;

      // Validate required parameters
      if (!asOfDate || typeof asOfDate !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_AS_OF_DATE',
            message: 'La fecha del balance es requerida (formato: YYYY-MM-DD)',
          },
        });
        return;
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(asOfDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AS_OF_DATE',
            message: 'La fecha del balance debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      // Validate comparison date if provided
      if (compareDate && typeof compareDate === 'string' && !dateRegex.test(compareDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPARE_DATE',
            message: 'La fecha de comparación debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      const query: IBalanceSheetQuery = {
        asOfDate,
        compareDate: compareDate as string | undefined,
        includeInactive: includeInactive === 'true',
        showZeroBalances: showZeroBalances === 'true',
      };

      // Get user ID from authenticated request
      const userId = (req as any).user?.id;

      const result = await this.reportService.getBalanceSheet(query, userId);
      res.status(200).json(result);
    } catch (error: any) {
      logErrorContext('ReportController.getBalanceSheet', error, {
        query: req.query,
      });

      if (error.message === 'INVALID_DATE_FORMAT') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Formato de fecha inválido',
          },
        });
        return;
      }

      if (error.message === 'INVALID_COMPARISON_DATE_FORMAT') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPARISON_DATE_FORMAT',
            message: 'Formato de fecha de comparación inválido',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno al generar el balance general',
        },
      });
    }
  }

  /**
   * GET /api/reports/account-movements
   * Get detailed movements for a specific account (drill-down)
   * 
   * Query parameters:
   * - accountId (required): Account ID to get movements for
   * - startDate (required): Start date in YYYY-MM-DD format
   * - endDate (required): End date in YYYY-MM-DD format
   */
  async getAccountMovements(req: Request, res: Response): Promise<void> {
    try {
      const { accountId, startDate, endDate } = req.query;

      // Validate required parameters
      if (!accountId || typeof accountId !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ACCOUNT_ID',
            message: 'El ID de cuenta es requerido',
          },
        });
        return;
      }

      if (!startDate || typeof startDate !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_START_DATE',
            message: 'La fecha de inicio es requerida (formato: YYYY-MM-DD)',
          },
        });
        return;
      }

      if (!endDate || typeof endDate !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_END_DATE',
            message: 'La fecha de fin es requerida (formato: YYYY-MM-DD)',
          },
        });
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_START_DATE',
            message: 'La fecha de inicio debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      if (!dateRegex.test(endDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_END_DATE',
            message: 'La fecha de fin debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      const query: IAccountMovementsQuery = {
        accountId: parseInt(accountId, 10),
        startDate,
        endDate,
      };

      if (isNaN(query.accountId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACCOUNT_ID',
            message: 'El ID de cuenta debe ser un número válido',
          },
        });
        return;
      }

      const userId = (req as any).user?.id;
      const result = await this.reportService.getAccountMovements(query, userId);
      res.status(200).json(result);
    } catch (error: any) {
      logErrorContext('ReportController.getAccountMovements', error, {
        query: req.query,
      });

      if (error.message === 'ACCOUNT_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'La cuenta especificada no existe',
          },
        });
        return;
      }

      if (error.message === 'INVALID_DATE_FORMAT') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Formato de fecha inválido',
          },
        });
        return;
      }

      if (error.message === 'INVALID_DATE_RANGE') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno al obtener los movimientos de la cuenta',
        },
      });
    }
  }

  /**
   * GET /api/reports/income-statement
   * Generate Income Statement (Estado de Resultados) report
   * 
   * Query parameters:
   * - startDate (required): Period start date in YYYY-MM-DD format
   * - endDate (required): Period end date in YYYY-MM-DD format
   * - compareStartDate (optional): Comparison period start date in YYYY-MM-DD format
   * - compareEndDate (optional): Comparison period end date in YYYY-MM-DD format
   * - includeInactive (optional): Include inactive accounts (default: false)
   * - showZeroBalances (optional): Show accounts with zero balance (default: false)
   * - groupByCategory (optional): Group by category (default: true)
   */
  async getIncomeStatement(req: Request, res: Response): Promise<void> {
    try {
      const { 
        startDate, 
        endDate, 
        compareStartDate, 
        compareEndDate, 
        includeInactive, 
        showZeroBalances,
        groupByCategory 
      } = req.query;

      // Validate required parameters
      if (!startDate || typeof startDate !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_START_DATE',
            message: 'La fecha de inicio es requerida (formato: YYYY-MM-DD)',
          },
        });
        return;
      }

      if (!endDate || typeof endDate !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_END_DATE',
            message: 'La fecha de fin es requerida (formato: YYYY-MM-DD)',
          },
        });
        return;
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_START_DATE',
            message: 'La fecha de inicio debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      if (!dateRegex.test(endDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_END_DATE',
            message: 'La fecha de fin debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      // Validate comparison dates if provided
      if (compareStartDate && typeof compareStartDate === 'string' && !dateRegex.test(compareStartDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPARE_START_DATE',
            message: 'La fecha de inicio de comparación debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      if (compareEndDate && typeof compareEndDate === 'string' && !dateRegex.test(compareEndDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPARE_END_DATE',
            message: 'La fecha de fin de comparación debe estar en formato YYYY-MM-DD',
          },
        });
        return;
      }

      const query: IIncomeStatementQuery = {
        startDate,
        endDate,
        compareStartDate: compareStartDate as string | undefined,
        compareEndDate: compareEndDate as string | undefined,
        includeInactive: includeInactive === 'true',
        showZeroBalances: showZeroBalances === 'true',
        groupByCategory: groupByCategory !== 'false',
      };

      // Get user ID from authenticated request
      const userId = (req as any).user?.id;

      const result = await this.reportService.getIncomeStatement(query, userId);
      res.status(200).json(result);
    } catch (error: any) {
      logErrorContext('ReportController.getIncomeStatement', error, {
        query: req.query,
      });

      if (error.message === 'INVALID_DATE_FORMAT') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Formato de fecha inválido',
          },
        });
        return;
      }

      if (error.message === 'START_DATE_AFTER_END_DATE') {
        res.status(400).json({
          success: false,
          error: {
            code: 'START_DATE_AFTER_END_DATE',
            message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
          },
        });
        return;
      }

      if (error.message === 'INVALID_COMPARISON_DATE_FORMAT') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPARISON_DATE_FORMAT',
            message: 'Formato de fecha de comparación inválido',
          },
        });
        return;
      }

      if (error.message === 'COMPARISON_START_AFTER_END') {
        res.status(400).json({
          success: false,
          error: {
            code: 'COMPARISON_START_AFTER_END',
            message: 'La fecha de inicio de comparación debe ser anterior a la fecha de fin',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno al generar el estado de resultados',
        },
      });
    }
  }
}
