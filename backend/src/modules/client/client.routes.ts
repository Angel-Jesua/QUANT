import { Router } from 'express';
import { ClientController } from './client.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();
const clientController = new ClientController();

// Protect all client routes with JWT
router.use(authenticateJWT);

// Client CRUD routes
router.post('/', clientController.createClient.bind(clientController));
router.get('/:id', clientController.getClientById.bind(clientController));
router.get('/', clientController.getAllClients.bind(clientController));
router.put('/:id', clientController.updateClient.bind(clientController));
router.delete('/:id', clientController.deleteClient.bind(clientController));

export { router as clientRoutes };