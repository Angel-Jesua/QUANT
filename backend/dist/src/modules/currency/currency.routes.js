"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currencyRoutes = void 0;
const express_1 = require("express");
const currency_controller_1 = require("./currency.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.currencyRoutes = router;
const currencyController = new currency_controller_1.CurrencyController();
// Protect all currency routes with JWT
router.use(auth_middleware_1.authenticateJWT);
// Currency CRUD routes
router.post('/', currencyController.createCurrency.bind(currencyController));
router.get('/:id', currencyController.getCurrencyById.bind(currencyController));
router.get('/', currencyController.getAllCurrencies.bind(currencyController));
router.put('/:id', currencyController.updateCurrency.bind(currencyController));
router.delete('/:id', currencyController.deleteCurrency.bind(currencyController));
