import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { uploadProfileImage } from '../../middleware/upload.middleware';
 
const router = Router();
const userController = new UserController();
 
// Public authentication routes (no JWT required)
router.post('/login', userController.login.bind(userController));
router.post('/register', userController.register.bind(userController));
 
// Apply JWT middleware to all subsequent routes
router.use(authenticateJWT);
 
// Protected user routes
router.get('/me', userController.getCurrentUser.bind(userController));
router.get('/', userController.getAllUsers.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));
router.post('/', userController.createUser.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.delete('/:id', userController.deleteUser.bind(userController));
router.post('/:id/change-password', userController.changePassword.bind(userController));
router.post('/:id/upload-image', uploadProfileImage.single('profileImage'), userController.uploadProfileImage.bind(userController));
 
export { router as userRoutes };