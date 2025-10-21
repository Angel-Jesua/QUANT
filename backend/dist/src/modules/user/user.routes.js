"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const user_controller_js_1 = require("./user.controller.js");
const router = (0, express_1.Router)();
exports.userRoutes = router;
const userController = new user_controller_js_1.UserController();
// User routes
router.get('/', userController.getAllUsers.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));
router.post('/', userController.createUser.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.delete('/:id', userController.deleteUser.bind(userController));
// Authentication routes
router.post('/login', userController.login.bind(userController));
router.post('/:id/change-password', userController.changePassword.bind(userController));
