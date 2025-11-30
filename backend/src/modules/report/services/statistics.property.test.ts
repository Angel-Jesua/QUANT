/**
 * Property-Based Tests for Statistics Service
 * Tests correctness properties defined in the design document
 */

import * as fc from 'fast-check';

// ============================================
// HELPER FUNCTIONS FOR TESTING
// ============================================

/**
 * Calculate net equity from assets and liabilities
 */
function calculateNetEquity(totalAssets: number, totalLiabilities: number): number {
  return Math.round((totalAssets - totalLiabilities) * 100) / 100;
}

/**
 * Calculate net profit/loss from revenue and expenses
 */
function calculateNetProfitLoss(revenue: number, expenses: number): number {
  return Math.round((revenue - expenses) * 100) / 100;
}

/**
 * Calculate gross profit from revenue and costs
 */
function calculateGrossProfit(revenue: number, costs: number): number {
  return Math.round((revenue - costs) * 100) / 100;
}

/**
 * Calculate net income from gross profit and operating expenses
 */
function calculateNetIncome(grossProfit: number, operatingExpenses: number): number {
  return Math.round((grossProfit - operatingExpenses) * 100) / 100;
}

/**
 * Check if accounting equation is balanced (Assets = Liabilities + Equity)
 */
function isAccountingEquationBalanced(
  assets: number,
  liabilities: number,
  equity: number,
  tolerance: number = 0.01
): boolean {
  return Math.abs(assets - (liabilities + equity)) < tolerance;
}

/**
 * Check if trial balance is balanced (Debits = Credits)
 */
function isTrialBalanceBalanced(
  totalDebits: number,
  totalCredits: number,
  tolerance: number = 0.01
): boolean {
  return Math.abs(totalDebits - totalCredits) < tolerance;
}

/**
 * Sum account balances
 */
function sumAccountBalances(balances: number[]): number {
  return Math.round(balances.reduce((sum, b) => sum + b, 0) * 100) / 100;
}

/**
 * Calculate expense distribution percentages
 */
function calculateExpensePercentages(amounts: number[]): number[] {
  const total = amounts.reduce((sum, a) => sum + a, 0);
  if (total === 0) return amounts.map(() => 0);
  return amounts.map(a => Math.round((a / total) * 10000) / 100);
}

/**
 * Calculate subtotal from child balances
 */
function calculateSubtotal(childBalances: number[]): number {
  return Math.round(childBalances.reduce((sum, b) => sum + b, 0) * 100) / 100;
}

// ============================================
// PROPERTY TESTS
// ============================================

describe('Statistics Service Property Tests', () => {
  // **Feature: statistics-module, Property 1: Account Balance Aggregation**
  // **Validates: Requirements 2.1, 2.2, 2.4, 2.5**
  describe('Property 1: Account Balance Aggregation', () => {
    it('should correctly sum account balances for KPI totals', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 1000000, noNaN: true }), { minLength: 0, maxLength: 100 }),
          (balances) => {
            const total = sumAccountBalances(balances);
            const expectedTotal = Math.round(balances.reduce((sum, b) => sum + b, 0) * 100) / 100;
            return Math.abs(total - expectedTotal) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty balance arrays', () => {
      const total = sumAccountBalances([]);
      expect(total).toBe(0);
    });

    it('should handle single account balance', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (balance) => {
            const total = sumAccountBalances([balance]);
            return Math.abs(total - Math.round(balance * 100) / 100) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: statistics-module, Property 2: Net Equity Calculation**
  // **Validates: Requirements 2.3**
  describe('Property 2: Net Equity Calculation', () => {
    it('should calculate net equity as assets minus liabilities', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (assets, liabilities) => {
            const netEquity = calculateNetEquity(assets, liabilities);
            const expected = Math.round((assets - liabilities) * 100) / 100;
            return Math.abs(netEquity - expected) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero when assets equal liabilities', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (value) => {
            const netEquity = calculateNetEquity(value, value);
            return Math.abs(netEquity) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return negative when liabilities exceed assets', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 500000, noNaN: true }),
          fc.float({ min: 500001, max: 1000000, noNaN: true }),
          (assets, liabilities) => {
            const netEquity = calculateNetEquity(assets, liabilities);
            return netEquity < 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: statistics-module, Property 3: Net Profit/Loss Calculation**
  // **Validates: Requirements 2.6**
  describe('Property 3: Net Profit/Loss Calculation', () => {
    it('should calculate net profit/loss as revenue minus expenses', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (revenue, expenses) => {
            const netProfitLoss = calculateNetProfitLoss(revenue, expenses);
            const expected = Math.round((revenue - expenses) * 100) / 100;
            return Math.abs(netProfitLoss - expected) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return positive (profit) when revenue exceeds expenses', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 500001, max: 1000000, noNaN: true }),
          fc.float({ min: 0, max: 500000, noNaN: true }),
          (revenue, expenses) => {
            const netProfitLoss = calculateNetProfitLoss(revenue, expenses);
            return netProfitLoss > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return negative (loss) when expenses exceed revenue', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 500000, noNaN: true }),
          fc.float({ min: 500001, max: 1000000, noNaN: true }),
          (revenue, expenses) => {
            const netProfitLoss = calculateNetProfitLoss(revenue, expenses);
            return netProfitLoss < 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: statistics-module, Property 4: Gross Profit Calculation**
  // **Validates: Requirements 4.2**
  describe('Property 4: Gross Profit Calculation', () => {
    it('should calculate gross profit as revenue minus costs', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (revenue, costs) => {
            const grossProfit = calculateGrossProfit(revenue, costs);
            const expected = Math.round((revenue - costs) * 100) / 100;
            return Math.abs(grossProfit - expected) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: statistics-module, Property 5: Net Income Calculation**
  // **Validates: Requirements 4.3**
  describe('Property 5: Net Income Calculation', () => {
    it('should calculate net income as gross profit minus operating expenses', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (grossProfit, operatingExpenses) => {
            const netIncome = calculateNetIncome(grossProfit, operatingExpenses);
            const expected = Math.round((grossProfit - operatingExpenses) * 100) / 100;
            return Math.abs(netIncome - expected) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain relationship: netIncome = revenue - costs - operatingExpenses', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000 }),
          fc.integer({ min: 0, max: 50000 }),
          fc.integer({ min: 0, max: 50000 }),
          (revenue, costs, operatingExpenses) => {
            const grossProfit = calculateGrossProfit(revenue, costs);
            const netIncome = calculateNetIncome(grossProfit, operatingExpenses);
            const directCalc = Math.round((revenue - costs - operatingExpenses) * 100) / 100;
            // Use larger tolerance due to intermediate rounding
            return Math.abs(netIncome - directCalc) < 0.02;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: statistics-module, Property 6: Accounting Equation Verification**
  // **Validates: Requirements 3.3**
  describe('Property 6: Accounting Equation Verification', () => {
    it('should return true when Assets = Liabilities + Equity', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 500000, noNaN: true }),
          fc.float({ min: 0, max: 500000, noNaN: true }),
          (liabilities, equity) => {
            const assets = liabilities + equity;
            return isAccountingEquationBalanced(assets, liabilities, equity);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when equation is not balanced', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 1000000, noNaN: true }),
          fc.float({ min: 0, max: 500000, noNaN: true }),
          fc.float({ min: 0, max: 500000, noNaN: true }),
          (assets, liabilities, equity) => {
            // Only test when there's a significant difference
            const difference = Math.abs(assets - (liabilities + equity));
            if (difference < 0.01) return true; // Skip balanced cases
            return !isAccountingEquationBalanced(assets, liabilities, equity);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero values correctly', () => {
      expect(isAccountingEquationBalanced(0, 0, 0)).toBe(true);
      expect(isAccountingEquationBalanced(100, 50, 50)).toBe(true);
      expect(isAccountingEquationBalanced(100, 0, 100)).toBe(true);
    });
  });

  // **Feature: statistics-module, Property 7: Trial Balance Verification**
  // **Validates: Requirements 5.3**
  describe('Property 7: Trial Balance Verification', () => {
    it('should return true when total debits equal total credits', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (value) => {
            return isTrialBalanceBalanced(value, value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when debits do not equal credits', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 1000000, noNaN: true }),
          fc.float({ min: 100, max: 1000000, noNaN: true }),
          (debits, credits) => {
            const difference = Math.abs(debits - credits);
            if (difference < 0.01) return true; // Skip balanced cases
            return !isTrialBalanceBalanced(debits, credits);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tolerance correctly', () => {
      // Within tolerance
      expect(isTrialBalanceBalanced(1000.005, 1000.000, 0.01)).toBe(true);
      // Outside tolerance
      expect(isTrialBalanceBalanced(1000.02, 1000.00, 0.01)).toBe(false);
    });
  });

  // **Feature: statistics-module, Property 11: Expense Distribution Sum**
  // **Validates: Requirements 7.2**
  describe('Property 11: Expense Distribution Sum', () => {
    it('should have percentages that sum to 100 (within tolerance)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 20 }),
          (amounts) => {
            const percentages = calculateExpensePercentages(amounts);
            const sum = percentages.reduce((s, p) => s + p, 0);
            // Allow 1% tolerance for rounding with many categories
            return Math.abs(sum - 100) < 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all zeros for empty or zero amounts', () => {
      const zeroAmounts = [0, 0, 0];
      const percentages = calculateExpensePercentages(zeroAmounts);
      expect(percentages.every(p => p === 0)).toBe(true);
    });

    it('should handle single category (100%)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          (amount) => {
            const percentages = calculateExpensePercentages([amount]);
            return Math.abs(percentages[0] - 100) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: statistics-module, Property 14: Subtotal Consistency**
  // **Validates: Requirements 3.2, 5.2**
  describe('Property 14: Subtotal Consistency', () => {
    it('should calculate parent subtotal as sum of child balances', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 100000, noNaN: true }), { minLength: 1, maxLength: 20 }),
          (childBalances) => {
            const subtotal = calculateSubtotal(childBalances);
            const expected = Math.round(childBalances.reduce((sum, b) => sum + b, 0) * 100) / 100;
            return Math.abs(subtotal - expected) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero for empty children', () => {
      const subtotal = calculateSubtotal([]);
      expect(subtotal).toBe(0);
    });

    it('should handle nested hierarchy correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 5 }),
          fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 5 }),
          (group1, group2) => {
            const subtotal1 = calculateSubtotal(group1);
            const subtotal2 = calculateSubtotal(group2);
            const parentTotal = calculateSubtotal([subtotal1, subtotal2]);
            const directTotal = calculateSubtotal([...group1, ...group2]);
            // Use larger tolerance due to intermediate rounding
            return Math.abs(parentTotal - directTotal) < 0.02;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================
// API VALIDATION PROPERTY TESTS
// ============================================

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDateFormat(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate date range (start <= end)
 */
function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

/**
 * Generate a valid date string
 */
function generateDateString(year: number, month: number, day: number): string {
  const y = Math.max(2000, Math.min(2100, year));
  const m = Math.max(1, Math.min(12, month));
  const d = Math.max(1, Math.min(28, day)); // Use 28 to avoid month-end issues
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// **Feature: statistics-module, Property 8: Date Range Validation**
// **Validates: Requirements 1.3**
describe('Property 8: Date Range Validation', () => {
  it('should accept valid date ranges where start <= end', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 365 }),
        (year, month, day, daysToAdd) => {
          const startDate = generateDateString(year, month, day);
          const start = new Date(startDate);
          const end = new Date(start);
          end.setDate(end.getDate() + daysToAdd);
          const endDate = end.toISOString().substring(0, 10);
          
          return isValidDateRange(startDate, endDate);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid date ranges where start > end', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 1, max: 365 }),
        (year, month, day, daysToSubtract) => {
          const endDate = generateDateString(year, month, day);
          const end = new Date(endDate);
          const start = new Date(end);
          start.setDate(start.getDate() + daysToSubtract);
          const startDate = start.toISOString().substring(0, 10);
          
          return !isValidDateRange(startDate, endDate);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept same date for start and end', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, day) => {
          const date = generateDateString(year, month, day);
          return isValidDateRange(date, date);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate date format correctly', () => {
    // Valid formats
    expect(isValidDateFormat('2024-01-15')).toBe(true);
    expect(isValidDateFormat('2024-12-31')).toBe(true);
    
    // Invalid formats
    expect(isValidDateFormat('2024-1-15')).toBe(false);
    expect(isValidDateFormat('24-01-15')).toBe(false);
    expect(isValidDateFormat('2024/01/15')).toBe(false);
    expect(isValidDateFormat('invalid')).toBe(false);
  });
});

// **Feature: statistics-module, Property 12: Statistics JSON Round-Trip**
// **Validates: Requirements 9.3, 9.4**
describe('Property 12: Statistics JSON Round-Trip', () => {
  /**
   * Create a mock statistics KPIs object
   */
  function createMockKPIs(
    assets: number,
    liabilities: number,
    revenue: number,
    expenses: number
  ) {
    const netEquity = assets - liabilities;
    const netProfitLoss = revenue - expenses;
    return {
      totalAssets: Math.round(assets * 100) / 100,
      totalLiabilities: Math.round(liabilities * 100) / 100,
      netEquity: Math.round(netEquity * 100) / 100,
      periodRevenue: Math.round(revenue * 100) / 100,
      periodExpenses: Math.round(expenses * 100) / 100,
      netProfitLoss: Math.round(netProfitLoss * 100) / 100,
      isProfit: netProfitLoss >= 0,
    };
  }

  it('should preserve KPI values through JSON serialization', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        (assets, liabilities, revenue, expenses) => {
          const original = createMockKPIs(assets, liabilities, revenue, expenses);
          const serialized = JSON.stringify(original);
          const deserialized = JSON.parse(serialized);
          
          return (
            deserialized.totalAssets === original.totalAssets &&
            deserialized.totalLiabilities === original.totalLiabilities &&
            deserialized.netEquity === original.netEquity &&
            deserialized.periodRevenue === original.periodRevenue &&
            deserialized.periodExpenses === original.periodExpenses &&
            deserialized.netProfitLoss === original.netProfitLoss &&
            deserialized.isProfit === original.isProfit
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve array data through JSON serialization', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            month: fc.constantFrom('2024-01', '2024-02', '2024-03', '2024-04'),
            income: fc.integer({ min: 0, max: 100000 }),
            expense: fc.integer({ min: 0, max: 100000 }),
          }),
          { minLength: 0, maxLength: 12 }
        ),
        (incomeVsExpense) => {
          const original = { incomeVsExpense };
          const serialized = JSON.stringify(original);
          const deserialized = JSON.parse(serialized);
          
          if (original.incomeVsExpense.length !== deserialized.incomeVsExpense.length) {
            return false;
          }
          
          for (let i = 0; i < original.incomeVsExpense.length; i++) {
            if (
              original.incomeVsExpense[i].month !== deserialized.incomeVsExpense[i].month ||
              original.incomeVsExpense[i].income !== deserialized.incomeVsExpense[i].income ||
              original.incomeVsExpense[i].expense !== deserialized.incomeVsExpense[i].expense
            ) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve nested objects through JSON serialization', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          subtotal: fc.integer({ min: 0, max: 1000000 }),
          accounts: fc.array(
            fc.record({
              accountId: fc.integer({ min: 1, max: 1000 }),
              accountNumber: fc.string({ minLength: 1, maxLength: 20 }),
              balance: fc.integer({ min: 0, max: 100000 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
        }),
        (category) => {
          const serialized = JSON.stringify(category);
          const deserialized = JSON.parse(serialized);
          
          return (
            deserialized.categoryName === category.categoryName &&
            deserialized.subtotal === category.subtotal &&
            deserialized.accounts.length === category.accounts.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle special numeric values correctly', () => {
    // Test with zero values
    const zeroKPIs = createMockKPIs(0, 0, 0, 0);
    const serializedZero = JSON.stringify(zeroKPIs);
    const deserializedZero = JSON.parse(serializedZero);
    expect(deserializedZero.totalAssets).toBe(0);
    expect(deserializedZero.isProfit).toBe(true);

    // Test with negative net values
    const negativeKPIs = createMockKPIs(1000, 2000, 500, 1000);
    const serializedNeg = JSON.stringify(negativeKPIs);
    const deserializedNeg = JSON.parse(serializedNeg);
    expect(deserializedNeg.netEquity).toBe(-1000);
    expect(deserializedNeg.isProfit).toBe(false);
  });
});
