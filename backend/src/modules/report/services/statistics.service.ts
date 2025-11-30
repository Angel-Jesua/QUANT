/**
 * Statistics Service
 * Facade that orchestrates atomized services for statistics dashboard
 */

import {
  IStatisticsQuery,
  IStatisticsResponse,
  IPredictionQuery,
  IPredictionResponse,
  MIN_MONTHS_FOR_PREDICTION,
  getInsufficientDataMessage,
} from '../statistics.types';
import { KpiAggregatorService } from './kpi-aggregator.service';
import { StatisticsSummaryService } from './statistics-summary.service';
import { ChartDataService } from './chart-data.service';
import { HistoricalDataService } from './historical-data.service';
import { PredictionEngineService } from './prediction-engine.service';

/**
 * Statistics Service - Facade for aggregated financial statistics
 */
export class StatisticsService {
  private kpiAggregator: KpiAggregatorService;
  private summaryService: StatisticsSummaryService;
  private chartDataService: ChartDataService;
  private historicalDataService: HistoricalDataService;
  private predictionEngine: PredictionEngineService;

  constructor() {
    this.kpiAggregator = new KpiAggregatorService();
    this.summaryService = new StatisticsSummaryService();
    this.chartDataService = new ChartDataService();
    this.historicalDataService = new HistoricalDataService();
    this.predictionEngine = new PredictionEngineService();
  }

  /**
   * Get complete statistics for a date range
   */
  async getStatistics(query: IStatisticsQuery): Promise<IStatisticsResponse> {
    const { startDate, endDate } = query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('INVALID_DATE_FORMAT');
    }

    if (start > end) {
      throw new Error('INVALID_DATE_RANGE');
    }

    const [kpis, balanceSheet, incomeStatement, trialBalance, charts] = await Promise.all([
      this.kpiAggregator.aggregateKPIs(start, end),
      this.summaryService.getBalanceSheetSummary(end),
      this.summaryService.getIncomeStatementSummary(start, end),
      this.summaryService.getTrialBalanceSummary(start, end),
      this.chartDataService.getChartData(start, end),
    ]);

    return {
      success: true,
      data: {
        kpis,
        balanceSheet,
        incomeStatement,
        trialBalance,
        charts,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get AI predictions for future periods
   */
  async getPredictions(query: IPredictionQuery): Promise<IPredictionResponse> {
    const { baseDate, months } = query;

    const base = new Date(baseDate);
    if (isNaN(base.getTime())) {
      throw new Error('INVALID_DATE_FORMAT');
    }

    const historicalMonths = Math.max(months, 12);
    const startDate = new Date(base);
    startDate.setMonth(startDate.getMonth() - historicalMonths);

    const [revenueHistory, costsHistory, expensesHistory] = await Promise.all([
      this.historicalDataService.getMonthlyData(startDate, base, ['Ingresos']),
      this.historicalDataService.getMonthlyData(startDate, base, ['Costos']),
      this.historicalDataService.getMonthlyData(startDate, base, ['Gastos']),
    ]);

    const minDataPoints = Math.min(revenueHistory.length, costsHistory.length, expensesHistory.length);
    const hasInsufficientData = minDataPoints < MIN_MONTHS_FOR_PREDICTION;

    return {
      success: true,
      data: {
        revenue: this.predictionEngine.generateProjectionSet(revenueHistory),
        costs: this.predictionEngine.generateProjectionSet(costsHistory),
        expenses: this.predictionEngine.generateProjectionSet(expensesHistory),
        hasInsufficientData,
        insufficientDataMessage: hasInsufficientData ? getInsufficientDataMessage(minDataPoints) : undefined,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
