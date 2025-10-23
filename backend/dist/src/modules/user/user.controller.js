"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("./user.service");
const password_1 = require("../../utils/password");
const user_validation_1 = require("./user.validation");
class UserController {
    constructor() {
        this.userService = new user_service_1.UserService();
    }
    /**
     * Get all users
     */
    async getAllUsers(req, res) {
        try {
            const users = await this.userService.getAllUsers();
            res.json(users);
        }
        catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const userId = parseInt(id, 10);
            if (isNaN(userId)) {
                res.status(400).json({ error: 'Invalid user ID' });
                return;
            }
            const user = await this.userService.getUserById(userId);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json(user);
        }
        catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    }
    /**
     * Create a new user
     */
    async createUser(req, res) {
        try {
            const userData = req.body;
            // First, validate basic user data
            const basicValidation = (0, user_validation_1.validateCreateUser)(userData);
            if (!basicValidation.isValid) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: basicValidation.errors
                });
                return;
            }
            // Check credential uniqueness
            const uniquenessCheck = await this.userService.checkCredentialUniqueness(userData.username, userData.email);
            if (!uniquenessCheck.isUnique) {
                res.status(409).json({
                    error: 'Validation failed',
                    details: uniquenessCheck.errors
                });
                return;
            }
            const user = await this.userService.createUser(userData);
            res.status(201).json(user);
        }
        catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
    /**
     * Update user
     */
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const userId = parseInt(id, 10);
            const userData = req.body;
            if (isNaN(userId)) {
                res.status(400).json({ error: 'Invalid user ID' });
                return;
            }
            // First, validate basic user data
            const basicValidation = (0, user_validation_1.validateUpdateUser)(userData);
            if (!basicValidation.isValid) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: basicValidation.errors
                });
                return;
            }
            // Check credential uniqueness if username or email is being updated
            if (userData.username || userData.email) {
                const uniquenessCheck = await this.userService.checkCredentialUniqueness(userData.username, userData.email, userId);
                if (!uniquenessCheck.isUnique) {
                    res.status(409).json({
                        error: 'Validation failed',
                        details: uniquenessCheck.errors
                    });
                    return;
                }
            }
            const user = await this.userService.updateUser(userId, userData);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json(user);
        }
        catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    }
    /**
     * Delete user (soft delete)
     */
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const userId = parseInt(id, 10);
            if (isNaN(userId)) {
                res.status(400).json({ error: 'Invalid user ID' });
                return;
            }
            await this.userService.deleteUser(userId);
            res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }
    /**
     * Authenticate user (login)
     */
    async login(req, res) {
        try {
            const loginData = req.body;
            // Validate login data
            const validation = (0, user_validation_1.validateLogin)(loginData);
            if (!validation.isValid) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: validation.errors
                });
                return;
            }
            const user = await this.userService.authenticateUser(loginData);
            if (!user) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }
            res.json(user);
        }
        catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ error: 'Failed to authenticate user' });
        }
    }
    /**
     * Change user password
     */
    async changePassword(req, res) {
        try {
            const { id } = req.params;
            const userId = parseInt(id, 10);
            const { currentPassword, newPassword } = req.body;
            if (isNaN(userId)) {
                res.status(400).json({ error: 'Invalid user ID' });
                return;
            }
            if (!currentPassword || !newPassword) {
                res.status(400).json({ error: 'Current password and new password are required' });
                return;
            }
            // Validate new password strength
            const passwordValidation = (0, password_1.validatePasswordStrength)(newPassword);
            if (!passwordValidation.isValid) {
                res.status(400).json({ error: passwordValidation.message });
                return;
            }
            const success = await this.userService.changePassword(userId, currentPassword, newPassword);
            if (!success) {
                res.status(400).json({ error: 'Invalid current password or user not found' });
                return;
            }
            res.json({ message: 'Password changed successfully' });
        }
        catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ error: 'Failed to change password' });
        }
    }
    /**
     * Register a new user with comprehensive validation
     */
    async register(req, res) {
        try {
            const registrationData = req.body;
            // Validate registration data
            const validation = (0, user_validation_1.validateRegisterUser)(registrationData);
            if (!validation.isValid) {
                const response = {
                    success: false,
                    message: 'Registration failed due to validation errors',
                    errors: validation.errors
                };
                res.status(400).json(response);
                return;
            }
            // Extract user creation data from registration data
            const userData = {
                username: registrationData.username,
                email: registrationData.email,
                password: registrationData.password,
                fullName: registrationData.fullName,
                role: registrationData.role
            };
            // Check credential uniqueness
            const uniquenessCheck = await this.userService.checkCredentialUniqueness(userData.username, userData.email);
            if (!uniquenessCheck.isUnique) {
                const response = {
                    success: false,
                    message: 'Registration failed due to duplicate credentials',
                    errors: uniquenessCheck.errors
                };
                res.status(409).json(response);
                return;
            }
            const user = await this.userService.createUser(userData);
            const response = {
                success: true,
                message: 'User registered successfully',
                user: user
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error during registration:', error);
            const response = {
                success: false,
                message: 'Failed to register user'
            };
            res.status(500).json(response);
        }
    }
}
exports.UserController = UserController;
