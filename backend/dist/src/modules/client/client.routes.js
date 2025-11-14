"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientRoutes = void 0;
const express_1 = require("express");
const client_controller_1 = require("./client.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.clientRoutes = router;
const clientController = new client_controller_1.ClientController();
// Protect all client routes with JWT
router.use(auth_middleware_1.authenticateJWT);
// Client CRUD routes
router.post('/', clientController.createClient.bind(clientController));
router.get('/:id', clientController.getClientById.bind(clientController));
router.get('/', clientController.getAllClients.bind(clientController));
router.put('/:id', clientController.updateClient.bind(clientController));
router.delete('/:id', clientController.deleteClient.bind(clientController));
