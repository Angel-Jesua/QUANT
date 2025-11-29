"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportUtilsService = void 0;
const client_1 = require("@prisma/client");
const report_types_1 = require("../report.types");
const prisma = new client_1.PrismaClient();
/**
 * Utility service for common report-related operations
 */
class ReportUtilsService {
    /**
     * Get available date range for journal entries
     * Useful for UI to show valid date picker boundaries
     */
    async getJournalDateRange() {
        const result = await prisma.journalEntry.aggregate({
            _min: { entryDate: true },
            _max: { entryDate: true },
            where: { isPosted: true },
        });
        return {
            minDate: result._min.entryDate?.toISOString().split('T')[0] ?? null,
            maxDate: result._max.entryDate?.toISOString().split('T')[0] ?? null,
        };
    }
    /**
     * Get account hierarchy levels present in the system
     * Useful for populating account level filter dropdown
     */
    async getAccountLevels() {
        const accounts = await prisma.account.findMany({
            select: { accountNumber: true },
            where: { isActive: true },
        });
        const levels = new Set();
        for (const account of accounts) {
            levels.add((0, report_types_1.calculateAccountLevel)(account.accountNumber));
        }
        return Array.from(levels).sort((a, b) => a - b);
    }
}
exports.ReportUtilsService = ReportUtilsService;
