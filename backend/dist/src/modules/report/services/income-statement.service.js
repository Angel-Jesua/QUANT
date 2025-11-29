"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeStatementService = void 0;
const client_1 = require("@prisma/client");
const report_types_1 = require("../report.types");
const prisma = new client_1.PrismaClient();
/**
 * Service for Income Statement (Estado de Resultados) report generation
 */
class IncomeStatementService {
    /**
     * Calculate account balances for a specific period
     * This is the core function for Income Statement calculations
     */
    async calculatePeriodBalances(startDate, endDate, accountTypes, includeInactive = false) {
        // Aggregate all journal entry lines for the specified period
        const balances = await prisma.journalEntryLine.groupBy({
            by: ['accountId'],
            _sum: {
                debitAmount: true,
                creditAmount: true,
            },
            where: {
                journalEntry: {
                    entryDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                    isPosted: true,
                    isReversed: false,
                },
                account: {
                    type: { in: accountTypes },
                    ...(includeInactive ? {} : { isActive: true }),
                },
            },
        });
        const balanceMap = new Map();
        for (const row of balances) {
            balanceMap.set(row.accountId, {
                debitSum: Number(row._sum.debitAmount ?? 0),
                creditSum: Number(row._sum.creditAmount ?? 0),
            });
        }
        return balanceMap;
    }
    /**
     * Generate Income Statement (Estado de Resultados) report
     * Shows financial performance over a period of time
     */
    async getIncomeStatement(query, userId) {
        const { startDate, endDate, compareStartDate, compareEndDate, includeInactive = false, showZeroBalances = false, groupByCategory = true, } = query;
        // Parse dates
        const periodStart = new Date(startDate);
        const periodEnd = new Date(endDate);
        const compStart = compareStartDate ? new Date(compareStartDate) : null;
        const compEnd = compareEndDate ? new Date(compareEndDate) : null;
        // Validate dates
        if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
            throw new Error('INVALID_DATE_FORMAT');
        }
        if (periodStart > periodEnd) {
            throw new Error('START_DATE_AFTER_END_DATE');
        }
        if (compStart && compEnd) {
            if (isNaN(compStart.getTime()) || isNaN(compEnd.getTime())) {
                throw new Error('INVALID_COMPARISON_DATE_FORMAT');
            }
            if (compStart > compEnd) {
                throw new Error('COMPARISON_START_AFTER_END');
            }
        }
        // Income Statement includes: Ingresos, Costos, Gastos
        const incomeStatementTypes = ['Ingresos', 'Costos', 'Gastos'];
        // Calculate current period balances
        const currentBalances = await this.calculatePeriodBalances(periodStart, periodEnd, incomeStatementTypes, includeInactive);
        // Calculate previous period balances if comparison dates provided
        let previousBalances = null;
        if (compStart && compEnd) {
            previousBalances = await this.calculatePeriodBalances(compStart, compEnd, incomeStatementTypes, includeInactive);
        }
        // Get all relevant accounts
        const accountWhere = {
            type: { in: incomeStatementTypes },
        };
        if (!includeInactive) {
            accountWhere.isActive = true;
        }
        const accounts = await prisma.account.findMany({
            where: accountWhere,
            select: {
                id: true,
                accountNumber: true,
                name: true,
                type: true,
                isDetail: true,
                parentAccountId: true,
                isActive: true,
            },
            orderBy: {
                accountNumber: 'asc',
            },
        });
        // Build Income Statement entries
        const entries = [];
        const categoryTotals = {
            revenue: { total: 0, previousTotal: 0, count: 0 },
            costs: { total: 0, previousTotal: 0, count: 0 },
            operating_expenses: { total: 0, previousTotal: 0, count: 0 },
        };
        for (const account of accounts) {
            const category = (0, report_types_1.getIncomeStatementCategory)(account.type);
            if (!category)
                continue;
            const level = (0, report_types_1.calculateAccountLevel)(account.accountNumber);
            const balance = currentBalances.get(account.id) ?? { debitSum: 0, creditSum: 0 };
            const debitNature = (0, report_types_1.isDebitNature)(account.type);
            // Calculate net amount for the period
            let netAmount;
            let amountType;
            if (debitNature) {
                // Costos y Gastos (aumentan con débito)
                netAmount = balance.debitSum - balance.creditSum;
                amountType = netAmount >= 0 ? 'debit' : 'credit';
            }
            else {
                // Ingresos (aumentan con crédito)
                netAmount = balance.creditSum - balance.debitSum;
                amountType = netAmount >= 0 ? 'credit' : 'debit';
            }
            // For Income Statement display, we want positive values
            const displayAmount = Math.abs(netAmount);
            // Skip zero balances if not requested
            if (!showZeroBalances && displayAmount === 0) {
                continue;
            }
            // Calculate previous period amount if comparison dates exist
            let previousAmount;
            let previousAmountType;
            let variance;
            let variancePercentage;
            if (previousBalances) {
                const prevBal = previousBalances.get(account.id) ?? { debitSum: 0, creditSum: 0 };
                let prevNetAmount;
                if (debitNature) {
                    prevNetAmount = prevBal.debitSum - prevBal.creditSum;
                    previousAmountType = prevNetAmount >= 0 ? 'debit' : 'credit';
                }
                else {
                    prevNetAmount = prevBal.creditSum - prevBal.debitSum;
                    previousAmountType = prevNetAmount >= 0 ? 'credit' : 'debit';
                }
                previousAmount = Math.abs(prevNetAmount);
                variance = displayAmount - previousAmount;
                if (previousAmount !== 0) {
                    variancePercentage = Math.round(((displayAmount - previousAmount) / previousAmount) * 10000) / 100;
                }
                else if (displayAmount !== 0) {
                    variancePercentage = 100; // New amount from zero
                }
                else {
                    variancePercentage = 0;
                }
            }
            entries.push({
                accountId: account.id,
                accountNumber: account.accountNumber,
                accountName: account.name,
                accountType: account.type,
                accountLevel: level,
                isDetail: account.isDetail,
                parentAccountId: account.parentAccountId ?? undefined,
                category,
                amount: displayAmount,
                amountType,
                previousAmount,
                previousAmountType,
                variance,
                variancePercentage,
            });
            // Update category totals (only for detail accounts to avoid double-counting)
            if (account.isDetail) {
                categoryTotals[category].total += displayAmount;
                categoryTotals[category].count++;
                if (previousAmount !== undefined) {
                    categoryTotals[category].previousTotal += previousAmount;
                }
            }
        }
        // Build category totals array
        const categories = Object.entries(categoryTotals)
            .map(([key, value]) => {
            const category = key;
            const totals = {
                category,
                categoryName: (0, report_types_1.getCategoryDisplayName)(category),
                order: (0, report_types_1.getCategoryOrder)(category),
                total: Math.round(value.total * 100) / 100,
                accountCount: value.count,
            };
            if (previousBalances) {
                totals.previousTotal = Math.round(value.previousTotal * 100) / 100;
                totals.variance = Math.round((value.total - value.previousTotal) * 100) / 100;
                if (value.previousTotal !== 0) {
                    totals.variancePercentage = Math.round(((value.total - value.previousTotal) / value.previousTotal) * 10000) / 100;
                }
                else if (value.total !== 0) {
                    totals.variancePercentage = 100;
                }
                else {
                    totals.variancePercentage = 0;
                }
            }
            return totals;
        })
            .sort((a, b) => a.order - b.order);
        // Build summary with profit/loss calculations
        const totalRevenue = Math.round(categoryTotals.revenue.total * 100) / 100;
        const totalCosts = Math.round(categoryTotals.costs.total * 100) / 100;
        const totalOperatingExpenses = Math.round(categoryTotals.operating_expenses.total * 100) / 100;
        // Gross Profit = Revenue - Costs
        const grossProfit = Math.round((totalRevenue - totalCosts) * 100) / 100;
        // Operating Income = Gross Profit - Operating Expenses
        const operatingIncome = Math.round((grossProfit - totalOperatingExpenses) * 100) / 100;
        // Net Income (for now, same as operating income since we don't have non-operating items)
        const netIncome = operatingIncome;
        // Profit margins
        const grossProfitMargin = totalRevenue !== 0
            ? Math.round((grossProfit / totalRevenue) * 10000) / 100
            : 0;
        const operatingMargin = totalRevenue !== 0
            ? Math.round((operatingIncome / totalRevenue) * 10000) / 100
            : 0;
        const netProfitMargin = totalRevenue !== 0
            ? Math.round((netIncome / totalRevenue) * 10000) / 100
            : 0;
        const summary = {
            startDate,
            endDate,
            totalRevenue,
            totalCosts,
            grossProfit,
            totalOperatingExpenses,
            operatingIncome,
            netIncome,
            grossProfitMargin,
            operatingMargin,
            netProfitMargin,
            accountCount: entries.length,
            isProfit: netIncome >= 0,
        };
        // Add comparison data to summary if available
        if (previousBalances) {
            summary.compareStartDate = compareStartDate;
            summary.compareEndDate = compareEndDate;
            const prevTotalRevenue = Math.round(categoryTotals.revenue.previousTotal * 100) / 100;
            const prevTotalCosts = Math.round(categoryTotals.costs.previousTotal * 100) / 100;
            const prevTotalOpEx = Math.round(categoryTotals.operating_expenses.previousTotal * 100) / 100;
            const prevGrossProfit = Math.round((prevTotalRevenue - prevTotalCosts) * 100) / 100;
            const prevOperatingIncome = Math.round((prevGrossProfit - prevTotalOpEx) * 100) / 100;
            const prevNetIncome = prevOperatingIncome;
            summary.previousTotalRevenue = prevTotalRevenue;
            summary.previousTotalCosts = prevTotalCosts;
            summary.previousGrossProfit = prevGrossProfit;
            summary.previousTotalOperatingExpenses = prevTotalOpEx;
            summary.previousOperatingIncome = prevOperatingIncome;
            summary.previousNetIncome = prevNetIncome;
            // Revenue variance
            summary.revenueVariance = Math.round((totalRevenue - prevTotalRevenue) * 100) / 100;
            if (prevTotalRevenue !== 0) {
                summary.revenueVariancePercentage = Math.round((summary.revenueVariance / prevTotalRevenue) * 10000) / 100;
            }
            // Costs variance
            summary.costsVariance = Math.round((totalCosts - prevTotalCosts) * 100) / 100;
            if (prevTotalCosts !== 0) {
                summary.costsVariancePercentage = Math.round((summary.costsVariance / prevTotalCosts) * 10000) / 100;
            }
            // Gross profit variance
            summary.grossProfitVariance = Math.round((grossProfit - prevGrossProfit) * 100) / 100;
            if (prevGrossProfit !== 0) {
                summary.grossProfitVariancePercentage = Math.round((summary.grossProfitVariance / prevGrossProfit) * 10000) / 100;
            }
            // Operating expenses variance
            summary.operatingExpensesVariance = Math.round((totalOperatingExpenses - prevTotalOpEx) * 100) / 100;
            if (prevTotalOpEx !== 0) {
                summary.operatingExpensesVariancePercentage = Math.round((summary.operatingExpensesVariance / prevTotalOpEx) * 10000) / 100;
            }
            // Net income variance
            summary.netIncomeVariance = Math.round((netIncome - prevNetIncome) * 100) / 100;
            if (prevNetIncome !== 0) {
                summary.netIncomeVariancePercentage = Math.round((summary.netIncomeVariance / Math.abs(prevNetIncome)) * 10000) / 100;
            }
        }
        return {
            success: true,
            data: {
                entries,
                categories,
                summary,
                generatedAt: new Date().toISOString(),
                generatedBy: userId,
            },
        };
    }
}
exports.IncomeStatementService = IncomeStatementService;
