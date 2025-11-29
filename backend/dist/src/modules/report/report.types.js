"use strict";
// Report module type definitions
// Types for financial reports including Trial Balance (Balanza de Comprobación)
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDIT_NATURE_TYPES = exports.DEBIT_NATURE_TYPES = void 0;
exports.isDebitNature = isDebitNature;
exports.isCreditNature = isCreditNature;
exports.calculateAccountLevel = calculateAccountLevel;
exports.getBalanceSheetSection = getBalanceSheetSection;
exports.getSectionDisplayName = getSectionDisplayName;
exports.getIncomeStatementCategory = getIncomeStatementCategory;
exports.getCategoryDisplayName = getCategoryDisplayName;
exports.getCategoryOrder = getCategoryOrder;
/**
 * Account nature mapping - determines how balance is calculated
 * Debit nature: Activo, Gastos, Costos (balance = debits - credits)
 * Credit nature: Pasivo, Capital, Ingresos (balance = credits - debits)
 */
exports.DEBIT_NATURE_TYPES = [
    'Activo',
    'Gastos',
    'Costos',
];
exports.CREDIT_NATURE_TYPES = [
    'Pasivo',
    'Capital',
    'Ingresos',
];
/**
 * Determines if an account type has debit nature
 */
function isDebitNature(type) {
    return exports.DEBIT_NATURE_TYPES.includes(type);
}
/**
 * Determines if an account type has credit nature
 */
function isCreditNature(type) {
    return exports.CREDIT_NATURE_TYPES.includes(type);
}
/**
 * Calculate account level from account number
 * Assumes account numbers use dot notation (e.g., "1", "1.1", "1.1.01")
 * Or digit-length based hierarchy (e.g., "1" = level 1, "11" = level 2, "1101" = level 3)
 */
function calculateAccountLevel(accountNumber) {
    // Check for dot notation first
    if (accountNumber.includes('.')) {
        return accountNumber.split('.').length;
    }
    // Check for dash notation
    if (accountNumber.includes('-')) {
        return accountNumber.split('-').length;
    }
    // Fallback to digit-length based hierarchy
    const len = accountNumber.replace(/\D/g, '').length;
    if (len <= 1)
        return 1;
    if (len <= 2)
        return 2;
    if (len <= 4)
        return 3;
    if (len <= 6)
        return 4;
    return 5;
}
/**
 * Map AccountType to BalanceSheetSection
 */
function getBalanceSheetSection(type) {
    switch (type) {
        case 'Activo':
            return 'assets';
        case 'Pasivo':
            return 'liabilities';
        case 'Capital':
            return 'equity';
        default:
            return null; // Income, Expense, Cost accounts don't appear in Balance Sheet
    }
}
/**
 * Get section display name
 */
function getSectionDisplayName(section) {
    const names = {
        assets: 'ACTIVOS',
        liabilities: 'PASIVOS',
        equity: 'PATRIMONIO',
    };
    return names[section];
}
/**
 * Map AccountType to IncomeStatementCategory
 */
function getIncomeStatementCategory(type) {
    switch (type) {
        case 'Ingresos':
            return 'revenue';
        case 'Costos':
            return 'costs';
        case 'Gastos':
            return 'operating_expenses';
        default:
            return null; // Asset, Liability, Equity accounts don't appear in Income Statement
    }
}
/**
 * Get category display name (Spanish)
 */
function getCategoryDisplayName(category) {
    const names = {
        revenue: 'INGRESOS',
        costs: 'COSTOS DE VENTA',
        operating_expenses: 'GASTOS OPERATIVOS',
    };
    return names[category];
}
/**
 * Get category order for display
 */
function getCategoryOrder(category) {
    const order = {
        revenue: 1,
        costs: 2,
        operating_expenses: 3,
    };
    return order[category];
}
