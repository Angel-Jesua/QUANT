"use strict";
/**
 * Journal Entry Service Unit Tests
 * Tests for double-entry accounting validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const journal_service_1 = require("./journal.service");
const client_1 = require("@prisma/client");
describe('validateDoubleEntry', () => {
    describe('Balanced entries (should pass)', () => {
        it('should accept a balanced entry with equal debits and credits', () => {
            const lines = [
                { accountId: 1, debitAmount: 1000, creditAmount: 0 },
                { accountId: 2, debitAmount: 0, creditAmount: 1000 },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit.toNumber()).toBe(1000);
            expect(result.totalCredit.toNumber()).toBe(1000);
            expect(result.difference.toNumber()).toBe(0);
            expect(result.errorMessage).toBeUndefined();
        });
        it('should accept a balanced entry with multiple lines', () => {
            const lines = [
                { accountId: 1, debitAmount: 500, creditAmount: 0 },
                { accountId: 2, debitAmount: 300, creditAmount: 0 },
                { accountId: 3, debitAmount: 200, creditAmount: 0 },
                { accountId: 4, debitAmount: 0, creditAmount: 600 },
                { accountId: 5, debitAmount: 0, creditAmount: 400 },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit.toNumber()).toBe(1000);
            expect(result.totalCredit.toNumber()).toBe(1000);
        });
        it('should accept a balanced entry with decimal amounts', () => {
            const lines = [
                { accountId: 1, debitAmount: '1234.56', creditAmount: 0 },
                { accountId: 2, debitAmount: 0, creditAmount: '1234.56' },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit.toFixed(2)).toBe('1234.56');
            expect(result.totalCredit.toFixed(2)).toBe('1234.56');
        });
        it('should accept a balanced entry with Prisma.Decimal amounts', () => {
            const lines = [
                { accountId: 1, debitAmount: new client_1.Prisma.Decimal('5000.00'), creditAmount: new client_1.Prisma.Decimal(0) },
                { accountId: 2, debitAmount: new client_1.Prisma.Decimal(0), creditAmount: new client_1.Prisma.Decimal('5000.00') },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit.toNumber()).toBe(5000);
            expect(result.totalCredit.toNumber()).toBe(5000);
        });
    });
    describe('Unbalanced entries (should fail)', () => {
        it('should reject an unbalanced entry where debits > credits', () => {
            const lines = [
                { accountId: 1, debitAmount: 1500, creditAmount: 0 },
                { accountId: 2, debitAmount: 0, creditAmount: 1000 },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(false);
            expect(result.totalDebit.toNumber()).toBe(1500);
            expect(result.totalCredit.toNumber()).toBe(1000);
            expect(result.difference.toNumber()).toBe(500);
            expect(result.errorMessage).toContain('no cuadra');
        });
        it('should reject an unbalanced entry where credits > debits', () => {
            const lines = [
                { accountId: 1, debitAmount: 800, creditAmount: 0 },
                { accountId: 2, debitAmount: 0, creditAmount: 1200 },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(false);
            expect(result.totalDebit.toNumber()).toBe(800);
            expect(result.totalCredit.toNumber()).toBe(1200);
            expect(result.difference.toNumber()).toBe(400);
            expect(result.errorMessage).toContain('no cuadra');
        });
        it('should reject an entry with small decimal imbalance', () => {
            const lines = [
                { accountId: 1, debitAmount: '100.01', creditAmount: 0 },
                { accountId: 2, debitAmount: 0, creditAmount: '100.00' },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(false);
            expect(result.difference.toFixed(2)).toBe('0.01');
            expect(result.errorMessage).toContain('no cuadra');
        });
    });
    describe('Zero amount entries (should fail)', () => {
        it('should reject an entry with zero total amount', () => {
            const lines = [
                { accountId: 1, debitAmount: 0, creditAmount: 0 },
                { accountId: 2, debitAmount: 0, creditAmount: 0 },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(false);
            expect(result.errorMessage).toContain('mayor a cero');
        });
        it('should reject an entry with only credit amounts (balanced at zero)', () => {
            const lines = [
                { accountId: 1, creditAmount: 0 },
                { accountId: 2, creditAmount: 0 },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(false);
            expect(result.errorMessage).toContain('mayor a cero');
        });
    });
    describe('Edge cases', () => {
        it('should handle undefined amounts as zero', () => {
            const lines = [
                { accountId: 1, debitAmount: 500, creditAmount: undefined },
                { accountId: 2, debitAmount: undefined, creditAmount: 500 },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit.toNumber()).toBe(500);
            expect(result.totalCredit.toNumber()).toBe(500);
        });
        it('should handle null amounts as zero', () => {
            const lines = [
                { accountId: 1, debitAmount: 750, creditAmount: null },
                { accountId: 2, debitAmount: null, creditAmount: 750 },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(true);
        });
        it('should handle very large amounts', () => {
            const lines = [
                { accountId: 1, debitAmount: '999999999999.99', creditAmount: 0 },
                { accountId: 2, debitAmount: 0, creditAmount: '999999999999.99' },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit.toFixed(2)).toBe('999999999999.99');
        });
        it('should handle string amounts', () => {
            const lines = [
                { accountId: 1, debitAmount: '2500.50', creditAmount: '0' },
                { accountId: 2, debitAmount: '0', creditAmount: '2500.50' },
            ];
            const result = (0, journal_service_1.validateDoubleEntry)(lines);
            expect(result.isBalanced).toBe(true);
        });
    });
});
