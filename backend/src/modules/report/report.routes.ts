import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();
const reportController = new ReportController();

// Protect all report routes with JWT
router.use(authenticateJWT);

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

export { router as reportRoutes };
