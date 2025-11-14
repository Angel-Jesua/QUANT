"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.userRoutes = router;
const userController = new user_controller_1.UserController();
// Public authentication routes (no JWT required)
router.post('/login', userController.login.bind(userController));
router.post('/register', userController.register.bind(userController));
// Apply JWT middleware to all subsequent routes
router.use(auth_middleware_1.authenticateJWT);
// Protected user routes
router.get('/', userController.getAllUsers.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));
router.post('/', userController.createUser.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.delete('/:id', userController.deleteUser.bind(userController));
router.post('/:id/change-password', userController.changePassword.bind(userController));
