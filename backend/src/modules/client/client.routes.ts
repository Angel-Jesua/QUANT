import { Router } from 'express';
import { ClientController, ClientVerifyController } from './client.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();
const clientController = new ClientController();
const clientVerifyController = new ClientVerifyController();

// Protect all client routes with JWT
router.use(authenticateJWT);

// Client CRUD routes
router.post('/', clientController.createClient.bind(clientController));
router.get('/:id', clientController.getClientById.bind(clientController));
router.get('/', clientController.getAllClients.bind(clientController));
router.put('/:id', clientController.updateClient.bind(clientController));
router.delete('/:id', clientController.deleteClient.bind(clientController));

// Verify password and get decrypted client details
router.post('/:id/verify-details', clientVerifyController.verifyAndGetDetails.bind(clientVerifyController));

export { router as clientRoutes };