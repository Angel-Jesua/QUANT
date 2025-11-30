/**
 * Statistics Controller
 * Handles HTTP requests for statistics and predictions endpoints
 */

import { Request, Response } from 'express';
import { StatisticsService } from './services';
import { IStatisticsQuery, IPredictionQuery } from './statistics.types';
import { logErrorContext } from '../../utils/error';

export class StatisticsController {
  private statisticsService = new StatisticsService();

  /**
   * GET /api/reports/statistics
   * Get aggregated financial statistics for a date range
   * 
   * Query parameters:
   * - startDate (required): Start date in YYYY-MM-DD format
   * - endDate (required): End date in YYYY-MM-DD format
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

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

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
          },
        });
        return;
      }

      const query: IStatisticsQuery = { startDate, endDate };
      const result = await this.statisticsService.getStatistics(query);
      res.status(200).json(result);
    } catch (error: any) {
      logErrorContext('StatisticsController.getStatistics', error, { query: req.query });

      if (error.message === 'INVALID_DATE_FORMAT') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_DATE_FORMAT', message: 'Formato de fecha inválido' },
        });
        return;
      }

      if (error.message === 'INVALID_DATE_RANGE') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_DATE_RANGE', message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin' },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Error interno al generar las estadísticas' },
      });
    }
  }

  /**
   * GET /api/reports/predictions
   * Get AI-powered financial predictions
   */
  async getPredictions(req: Request, res: Response): Promise<void> {
    try {
      const { baseDate, months } = req.query;

      if (!baseDate || typeof baseDate !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_BASE_DATE', message: 'La fecha base es requerida (formato: YYYY-MM-DD)' },
        });
        return;
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(baseDate)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_BASE_DATE', message: 'La fecha base debe estar en formato YYYY-MM-DD' },
        });
        return;
      }

      let monthsValue = 12;
      if (months && typeof months === 'string') {
        monthsValue = parseInt(months, 10);
        if (isNaN(monthsValue) || monthsValue < 3) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_MONTHS', message: 'El parámetro months debe ser un número mayor o igual a 3' },
          });
          return;
        }
      }

      const query: IPredictionQuery = { baseDate, months: monthsValue };
      const result = await this.statisticsService.getPredictions(query);
      res.status(200).json(result);
    } catch (error: any) {
      logErrorContext('StatisticsController.getPredictions', error, { query: req.query });

      if (error.message === 'INVALID_DATE_FORMAT') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_DATE_FORMAT', message: 'Formato de fecha inválido' },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Error interno al generar las predicciones' },
      });
    }
  }
}
