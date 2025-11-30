import { Router } from 'express';
import { ReportController } from './report.controller';
import { StatisticsController } from './statistics.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();
const reportController = new ReportController();
const statisticsController = new StatisticsController();

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

// Statistics endpoints (using dedicated controller)
router.get('/statistics', statisticsController.getStatistics.bind(statisticsController));
router.get('/predictions', statisticsController.getPredictions.bind(statisticsController));

export { router as reportRoutes };
