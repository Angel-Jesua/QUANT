/**
 * Prediction Engine Service
 * Implements AI-powered financial predictions using linear regression and moving averages
 */

import {
  IMonthlyDataPoint,
  IProjectedValue,
  IProjectionSet,
  ILinearRegressionResult,
  MIN_MONTHS_FOR_PREDICTION,
  hasInsufficientData,
} from '../statistics.types';

export class PredictionEngineService {
  /**
   * Calculate linear regression using least squares method
   * y = mx + b where m is slope and b is intercept
   */
  calculateLinearRegression(data: number[]): ILinearRegressionResult {
    const n = data.length;
    
    if (n === 0) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }
    
    if (n === 1) {
      return { slope: 0, intercept: data[0], rSquared: 1 };
    }

    // x values are indices (0, 1, 2, ...)
    const xValues = data.map((_, i) => i);
    const yValues = data;

    // Calculate means
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

    // Calculate slope (m) and intercept (b)
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += (xValues[i] - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Calculate R² (coefficient of determination)
    const yPredicted = xValues.map(x => slope * x + intercept);
    const ssRes = yValues.reduce((sum, y, i) => sum + (y - yPredicted[i]) ** 2, 0);
    const ssTot = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
    const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 1;

    return {
      slope,
      intercept,
      rSquared: Math.max(0, Math.min(1, rSquared)), // Clamp between 0 and 1
    };
  }

  /**
   * Calculate moving average with configurable window size
   */
  calculateMovingAverage(data: number[], window: number): number[] {
    if (data.length === 0 || window <= 0) {
      return [];
    }

    const effectiveWindow = Math.min(window, data.length);
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - effectiveWindow + 1);
      const slice = data.slice(start, i + 1);
      const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      result.push(avg);
    }

    return result;
  }

  /**
   * Project values for future months using linear regression
   */
  projectValues(
    historical: IMonthlyDataPoint[],
    monthsToProject: number
  ): IProjectedValue[] {
    if (historical.length === 0 || monthsToProject <= 0) {
      return [];
    }

    const values = historical.map(h => h.value);
    const regression = this.calculateLinearRegression(values);
    
    // Calculate standard error for confidence bounds
    const standardError = this.calculateStandardError(values, regression);
    
    const projections: IProjectedValue[] = [];
    const lastMonth = historical[historical.length - 1].month;
    const startIndex = values.length;

    for (let i = 0; i < monthsToProject; i++) {
      const x = startIndex + i;
      const predictedValue = regression.slope * x + regression.intercept;
      
      // Confidence bounds widen as we project further into the future
      const uncertaintyFactor = 1 + (i * 0.1); // 10% increase per month
      const margin = standardError * 1.96 * uncertaintyFactor; // 95% confidence interval
      
      projections.push({
        month: this.addMonths(lastMonth, i + 1),
        value: Math.max(0, predictedValue), // Ensure non-negative
        lowerBound: Math.max(0, predictedValue - margin),
        upperBound: predictedValue + margin,
      });
    }

    return projections;
  }

  /**
   * Calculate confidence score based on R², sample size, and data variance
   * Returns a value between 0 and 100
   */
  calculateConfidence(data: number[]): number {
    if (data.length < MIN_MONTHS_FOR_PREDICTION) {
      return 0;
    }

    const regression = this.calculateLinearRegression(data);
    
    // Base confidence from R² (0-50 points)
    const rSquaredScore = regression.rSquared * 50;
    
    // Sample size bonus (0-30 points)
    // More data = higher confidence, max at 24 months
    const sampleSizeScore = Math.min(30, (data.length / 24) * 30);
    
    // Variance penalty (0-20 points deducted)
    const coefficientOfVariation = this.calculateCoefficientOfVariation(data);
    const variancePenalty = Math.min(20, coefficientOfVariation * 20);
    
    const confidence = rSquaredScore + sampleSizeScore - variancePenalty + 20; // Base 20 points
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Generate complete projection set for a metric
   */
  generateProjectionSet(historical: IMonthlyDataPoint[]): IProjectionSet {
    const values = historical.map(h => h.value);
    const confidence = this.calculateConfidence(values);

    return {
      historical,
      projections: {
        threeMonths: this.projectValues(historical, 3),
        sixMonths: this.projectValues(historical, 6),
        twelveMonths: this.projectValues(historical, 12),
      },
      confidence,
    };
  }

  /**
   * Check if there's sufficient data for predictions
   */
  hasInsufficientData(monthsOfData: number): boolean {
    return hasInsufficientData(monthsOfData);
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Calculate standard error of the regression
   */
  private calculateStandardError(
    data: number[],
    regression: ILinearRegressionResult
  ): number {
    const n = data.length;
    if (n <= 2) return 0;

    const predictions = data.map((_, i) => regression.slope * i + regression.intercept);
    const residuals = data.map((y, i) => y - predictions[i]);
    const sumSquaredResiduals = residuals.reduce((sum, r) => sum + r ** 2, 0);
    
    return Math.sqrt(sumSquaredResiduals / (n - 2));
  }

  /**
   * Calculate coefficient of variation (CV)
   * CV = standard deviation / mean
   */
  private calculateCoefficientOfVariation(data: number[]): number {
    if (data.length === 0) return 0;
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    if (mean === 0) return 0;
    
    const variance = data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.abs(stdDev / mean);
  }

  /**
   * Add months to a date string (YYYY-MM format)
   */
  private addMonths(monthStr: string, monthsToAdd: number): string {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1 + monthsToAdd, 1);
    
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${newYear}-${newMonth}`;
  }
}
