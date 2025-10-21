"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_js_1 = require("./user.service.js");
const password_js_1 = require("../../utils/password.js");
class UserController {
    constructor() {
        this.userService = new user_service_js_1.UserService();
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
            // Basic validation
            if (!userData.username || !userData.email || !userData.password || !userData.fullName) {
                res.status(400).json({ error: 'Missing required fields' });
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
            // Basic validation
            if (!loginData.email || !loginData.password) {
                res.status(400).json({ error: 'Email and password are required' });
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
            const passwordValidation = (0, password_js_1.validatePasswordStrength)(newPassword);
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
}
exports.UserController = UserController;
