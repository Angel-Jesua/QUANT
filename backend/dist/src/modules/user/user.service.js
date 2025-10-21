"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const password_js_1 = require("../../utils/password.js");
const prisma = new client_1.PrismaClient();
class UserService {
    /**
     * Get all users
     */
    async getAllUsers() {
        const users = await prisma.userAccount.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                profileImageUrl: true,
                avatarType: true,
                lastLogin: true,
            },
        });
        return users.map(user => ({
            ...user,
            profileImageUrl: user.profileImageUrl || undefined,
            lastLogin: user.lastLogin || undefined,
        }));
    }
    /**
     * Get user by ID
     */
    async getUserById(id) {
        const user = await prisma.userAccount.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                profileImageUrl: true,
                avatarType: true,
                lastLogin: true,
            },
        });
        if (!user) {
            return null;
        }
        return {
            ...user,
            profileImageUrl: user.profileImageUrl || undefined,
            lastLogin: user.lastLogin || undefined,
        };
    }
    /**
     * Create a new user
     */
    async createUser(userData) {
        // Hash the password before storing it
        const passwordHash = await (0, password_js_1.hashPassword)(userData.password);
        const user = await prisma.userAccount.create({
            data: {
                username: userData.username,
                email: userData.email,
                passwordHash: passwordHash,
                fullName: userData.fullName,
                role: userData.role,
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                profileImageUrl: true,
                avatarType: true,
                lastLogin: true,
            },
        });
        return {
            ...user,
            profileImageUrl: user.profileImageUrl || undefined,
            lastLogin: user.lastLogin || undefined,
        };
    }
    /**
     * Update user
     */
    async updateUser(id, userData) {
        const user = await prisma.userAccount.update({
            where: { id },
            data: userData,
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                profileImageUrl: true,
                avatarType: true,
                lastLogin: true,
            },
        });
        return {
            ...user,
            profileImageUrl: user.profileImageUrl || undefined,
            lastLogin: user.lastLogin || undefined,
        };
    }
    /**
     * Delete user (soft delete by setting isActive to false)
     */
    async deleteUser(id) {
        await prisma.userAccount.update({
            where: { id },
            data: { isActive: false },
        });
        return true;
    }
    /**
     * Authenticate user with email and password
     */
    async authenticateUser(loginData) {
        try {
            // Find user by email
            const user = await prisma.userAccount.findUnique({
                where: { email: loginData.email },
            });
            if (!user || !user.isActive) {
                return null;
            }
            // Compare passwords
            const isPasswordValid = await (0, password_js_1.comparePassword)(loginData.password, user.passwordHash);
            if (!isPasswordValid) {
                return null;
            }
            // Update last login
            await prisma.userAccount.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });
            // Return user data without sensitive information
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                profileImageUrl: user.profileImageUrl || undefined,
                avatarType: user.avatarType,
                lastLogin: new Date(),
            };
        }
        catch (error) {
            console.error('Error authenticating user:', error);
            return null;
        }
    }
    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Find user
            const user = await prisma.userAccount.findUnique({
                where: { id: userId },
            });
            if (!user) {
                return false;
            }
            // Verify current password
            const isCurrentPasswordValid = await (0, password_js_1.comparePassword)(currentPassword, user.passwordHash);
            if (!isCurrentPasswordValid) {
                return false;
            }
            // Hash new password
            const newPasswordHash = await (0, password_js_1.hashPassword)(newPassword);
            // Update password
            await prisma.userAccount.update({
                where: { id: userId },
                data: {
                    passwordHash: newPasswordHash,
                    updatedAt: new Date(),
                },
            });
            return true;
        }
        catch (error) {
            console.error('Error changing password:', error);
            return false;
        }
    }
}
exports.UserService = UserService;
