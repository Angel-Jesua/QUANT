"use strict";
/**
 * Journal Entry Utilities
 * Helper functions for decimal conversions and common operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDecimal = toDecimal;
exports.formatDecimal = formatDecimal;
exports.isZero = isZero;
exports.isPositive = isPositive;
const client_1 = require("@prisma/client");
/**
 * Convert value to Prisma Decimal for precise calculations
 * Handles undefined, null, number, string, and Decimal inputs
 */
function toDecimal(value) {
    if (value === undefined || value === null) {
        return new client_1.Prisma.Decimal(0);
    }
    return new client_1.Prisma.Decimal(value.toString());
}
/**
 * Format a Decimal value to fixed decimal places string
 */
function formatDecimal(value, decimals = 2) {
    return value.toFixed(decimals);
}
/**
 * Check if a Decimal value is zero
 */
function isZero(value) {
    return value.isZero();
}
/**
 * Check if a Decimal is greater than zero
 */
function isPositive(value) {
    return value.greaterThan(0);
}
