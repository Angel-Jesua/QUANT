"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const user_controller_1 = require("../user/user.controller");
const router = (0, express_1.Router)();
exports.authRoutes = router;
const userController = new user_controller_1.UserController();
// Authentication routes - these redirect to user controller methods
router.post('/login', userController.login.bind(userController));
router.post('/register', userController.register.bind(userController));
