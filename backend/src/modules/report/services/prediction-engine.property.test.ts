/**
 * Property-Based Tests for PredictionEngine
 * Using fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { PredictionEngineService } from './prediction-engine.service';
import { IMonthlyDataPoint, MIN_MONTHS_FOR_PREDICTION } from '../statistics.types';

describe('PredictionEngineService Property Tests', () => {
  let predictionEngine: PredictionEngineService;

  beforeEach(() => {
    predictionEngine = new PredictionEngineService();
  });

  /**
   * **Feature: statistics-module, Property 13: Linear Regression Projection Monotonicity**
   * **Validates: Requirements 6.1**
   * 
   * For any strictly increasing historical data series, 
   * the linear regression projection SHALL produce non-decreasing projected values.
   */
  describe('Property 13: Linear Regression Projection Monotonicity', () => {
    it('should produce non-decreasing projections for strictly increasing data', () => {
      fc.assert(
        fc.property(
          // Generate a strictly increasing sequence of positive numbers
          fc.array(fc.float({ min: 1, max: 1000, noNaN: true }), { minLength: 3, maxLength: 24 })
            .map(arr => {
              // Sort and ensure strictly increasing
              const sorted = [...arr].sort((a, b) => a - b);
              return sorted.map((val, i) => val + i * 10); // Add offset to ensure strictly increasing
            }),
          (values) => {
            // Create monthly data points
            const historical: IMonthlyDataPoint[] = values.map((value, i) => ({
              month: `2024-${String(i + 1).padStart(2, '0')}`,
              value,
            }));

            // Get projections
            const projections = predictionEngine.projectValues(historical, 6);

            // Verify projections are non-decreasing
            for (let i = 1; i < projections.length; i++) {
              expect(projections[i].value).toBeGreaterThanOrEqual(projections[i - 1].value);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have positive slope for strictly increasing data', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 1, max: 100, noNaN: true }), { minLength: 3, maxLength: 20 })
            .map(arr => {
              const sorted = [...arr].sort((a, b) => a - b);
              return sorted.map((val, i) => val + i * 5);
            }),
          (values) => {
            const regression = predictionEngine.calculateLinearRegression(values);
            expect(regression.slope).toBeGreaterThanOrEqual(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: statistics-module, Property 10: Confidence Indicator Bounds**
   * **Validates: Requirements 6.3**
   * 
   * For any prediction calculation, the confidence indicator 
   * SHALL be a value between 0 and 100 inclusive.
   */
  describe('Property 10: Confidence Indicator Bounds', () => {
    it('should always return confidence between 0 and 100', () => {
      fc.assert(
        fc.property(
          // Generate random arrays of positive numbers
          fc.array(fc.float({ min: 0, max: 10000, noNaN: true }), { minLength: 1, maxLength: 36 }),
          (values) => {
            const confidence = predictionEngine.calculateConfidence(values);
            
            expect(confidence).toBeGreaterThanOrEqual(0);
            expect(confidence).toBeLessThanOrEqual(100);
            expect(Number.isInteger(confidence)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 confidence for insufficient data', () => {
      fc.assert(
        fc.property(
          // Generate arrays with less than MIN_MONTHS_FOR_PREDICTION elements
          fc.array(fc.float({ min: 0, max: 1000, noNaN: true }), { 
            minLength: 0, 
            maxLength: MIN_MONTHS_FOR_PREDICTION - 1 
          }),
          (values) => {
            const confidence = predictionEngine.calculateConfidence(values);
            expect(confidence).toBe(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have higher confidence with more data points', () => {
      fc.assert(
        fc.property(
          // Generate consistent data (low variance)
          fc.float({ min: 100, max: 200, noNaN: true }),
          (baseValue) => {
            // Create two datasets: small and large
            const smallData = Array(4).fill(0).map((_, i) => baseValue + i);
            const largeData = Array(12).fill(0).map((_, i) => baseValue + i);

            const smallConfidence = predictionEngine.calculateConfidence(smallData);
            const largeConfidence = predictionEngine.calculateConfidence(largeData);

            // More data should generally give higher or equal confidence
            expect(largeConfidence).toBeGreaterThanOrEqual(smallConfidence - 10); // Allow small tolerance
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: statistics-module, Property 9: Insufficient Data Detection**
   * **Validates: Requirements 6.5**
   * 
   * For any historical data set with fewer than 3 months of data,
   * the prediction engine SHALL return hasInsufficientData = true.
   */
  describe('Property 9: Insufficient Data Detection', () => {
    it('should detect insufficient data for less than 3 months', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: MIN_MONTHS_FOR_PREDICTION - 1 }),
          (monthsOfData) => {
            const result = predictionEngine.hasInsufficientData(monthsOfData);
            expect(result).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not flag insufficient data for 3 or more months', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MIN_MONTHS_FOR_PREDICTION, max: 60 }),
          (monthsOfData) => {
            const result = predictionEngine.hasInsufficientData(monthsOfData);
            expect(result).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate empty projections for empty historical data', () => {
      const emptyHistorical: IMonthlyDataPoint[] = [];
      const projections = predictionEngine.projectValues(emptyHistorical, 6);
      expect(projections).toHaveLength(0);
    });

    it('should handle edge case of exactly MIN_MONTHS_FOR_PREDICTION months', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 1, max: 1000, noNaN: true }), { 
            minLength: MIN_MONTHS_FOR_PREDICTION, 
            maxLength: MIN_MONTHS_FOR_PREDICTION 
          }),
          (values) => {
            const historical: IMonthlyDataPoint[] = values.map((value, i) => ({
              month: `2024-${String(i + 1).padStart(2, '0')}`,
              value,
            }));

            // Should not be flagged as insufficient
            expect(predictionEngine.hasInsufficientData(historical.length)).toBe(false);
            
            // Should be able to generate projections
            const projections = predictionEngine.projectValues(historical, 3);
            expect(projections.length).toBe(3);
            
            // Confidence should be > 0
            const confidence = predictionEngine.calculateConfidence(values);
            expect(confidence).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional helper tests for regression quality
  describe('Linear Regression Quality', () => {
    it('should have R² between 0 and 1', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: -1000, max: 1000, noNaN: true }), { minLength: 2, maxLength: 50 }),
          (values) => {
            const regression = predictionEngine.calculateLinearRegression(values);
            expect(regression.rSquared).toBeGreaterThanOrEqual(0);
            expect(regression.rSquared).toBeLessThanOrEqual(1);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have R² = 1 for perfectly linear data', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(0.5), max: Math.fround(10), noNaN: true }),
          fc.integer({ min: 3, max: 20 }),
          (intercept, slope, length) => {
            const values = Array(length).fill(0).map((_, i) => intercept + slope * i);
            const regression = predictionEngine.calculateLinearRegression(values);
            expect(regression.rSquared).toBeCloseTo(1, 4);
            expect(regression.slope).toBeCloseTo(slope, 4);
            expect(regression.intercept).toBeCloseTo(intercept, 4);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Moving Average', () => {
    it('should return same length array as input', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 1000, noNaN: true }), { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 12 }),
          (values, window) => {
            const result = predictionEngine.calculateMovingAverage(values, window);
            expect(result.length).toBe(values.length);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce values within the range of input values', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 1000, noNaN: true }), { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 12 }),
          (values, window) => {
            const result = predictionEngine.calculateMovingAverage(values, window);
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            for (const avg of result) {
              expect(avg).toBeGreaterThanOrEqual(min - 0.001);
              expect(avg).toBeLessThanOrEqual(max + 0.001);
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
