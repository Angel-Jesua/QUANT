import { Router } from 'express';
import { CurrencyController } from './currency.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();
const currencyController = new CurrencyController();

// Protect all currency routes with JWT
router.use(authenticateJWT);

// Currency CRUD routes
router.post('/', currencyController.createCurrency.bind(currencyController));
router.get('/:id', currencyController.getCurrencyById.bind(currencyController));
router.get('/', currencyController.getAllCurrencies.bind(currencyController));
router.put('/:id', currencyController.updateCurrency.bind(currencyController));
router.delete('/:id', currencyController.deleteCurrency.bind(currencyController));

export { router as currencyRoutes };