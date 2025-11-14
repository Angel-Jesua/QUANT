import { Router } from 'express';
import { AccountController } from './account.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();
const accountController = new AccountController();

// Protect all account routes with JWT
router.use(authenticateJWT);

// Account CRUD routes
router.post('/', accountController.createAccount.bind(accountController));
router.get('/:id', accountController.getAccountById.bind(accountController));
router.get('/', accountController.getAllAccounts.bind(accountController));
router.put('/:id', accountController.updateAccount.bind(accountController));
router.delete('/:id', accountController.deleteAccount.bind(accountController));

export { router as accountRoutes };