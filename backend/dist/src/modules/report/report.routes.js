"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const report_controller_1 = require("./report.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.reportRoutes = router;
const reportController = new report_controller_1.ReportController();
// Protect all report routes with JWT
router.use(auth_middleware_1.authenticateJWT);
// Trial Balance (Balanza de Comprobación)
router.get('/trial-balance', reportController.getTrialBalance.bind(reportController));
// Balance Sheet (Balance General)
router.get('/balance-sheet', reportController.getBalanceSheet.bind(reportController));
// Income Statement (Estado de Resultados)
router.get('/income-statement', reportController.getIncomeStatement.bind(reportController));
// Account Movements (Drill-down)
router.get('/account-movements', reportController.getAccountMovements.bind(reportController));
// Utility endpoints for report UI
router.get('/journal-date-range', reportController.getJournalDateRange.bind(reportController));
router.get('/account-levels', reportController.getAccountLevels.bind(reportController));
