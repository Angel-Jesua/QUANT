import { Router } from 'express';
import { UserController } from '../user/user.controller';

const router = Router();
const userController = new UserController();

// Authentication routes - these redirect to user controller methods
router.post('/login', userController.login.bind(userController));
router.post('/register', userController.register.bind(userController));

export { router as authRoutes };
