/**
 * Journal Entry Utilities
 * Helper functions for decimal conversions and common operations
 */

import { Prisma } from '@prisma/client';

/**
 * Convert value to Prisma Decimal for precise calculations
 * Handles undefined, null, number, string, and Decimal inputs
 */
export function toDecimal(value: number | string | Prisma.Decimal | undefined | null): Prisma.Decimal {
  if (value === undefined || value === null) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value.toString());
}

/**
 * Format a Decimal value to fixed decimal places string
 */
export function formatDecimal(value: Prisma.Decimal, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Check if a Decimal value is zero
 */
export function isZero(value: Prisma.Decimal): boolean {
  return value.isZero();
}

/**
 * Check if a Decimal is greater than zero
 */
export function isPositive(value: Prisma.Decimal): boolean {
  return value.greaterThan(0);
}
