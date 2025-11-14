"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRoutes = void 0;
const express_1 = require("express");
const account_controller_1 = require("./account.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.accountRoutes = router;
const accountController = new account_controller_1.AccountController();
// Protect all account routes with JWT
router.use(auth_middleware_1.authenticateJWT);
// Account CRUD routes
router.post('/', accountController.createAccount.bind(accountController));
router.get('/:id', accountController.getAccountById.bind(accountController));
router.get('/', accountController.getAllAccounts.bind(accountController));
router.put('/:id', accountController.updateAccount.bind(accountController));
router.delete('/:id', accountController.deleteAccount.bind(accountController));
