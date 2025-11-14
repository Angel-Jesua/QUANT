"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("./user.service");
const password_1 = require("../../utils/password");
const user_validation_1 = require("./user.validation");
const jwt_1 = require("../../utils/jwt");
const error_1 = require("../../utils/error");
const client_1 = require("@prisma/client");
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
            (0, error_1.logErrorContext)('user.getAll.error', error, { ip: req.ip || req.connection?.remoteAddress, ua: req.get('User-Agent') });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.update,
                entityType: 'user',
                errorKey: 'fetch_users_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
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
            (0, error_1.logErrorContext)('user.getById.error', error, { id: req.params.id });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.update,
                entityType: 'user',
                entityId: parseInt(req.params.id, 10),
                errorKey: 'fetch_user_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
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
                    success: false,
                    message: 'Validation failed',
                    errors: basicValidation.errors
                });
                return;
            }
            // Check credential uniqueness
            const uniquenessCheck = await this.userService.checkCredentialUniqueness(userData.username, userData.email);
            if (!uniquenessCheck.isUnique) {
                res.status(409).json({
                    success: false,
                    message: 'Validation failed - duplicate credentials',
                    errors: uniquenessCheck.errors
                });
                return;
            }
            // Extract request context for audit logging
            const requestContext = {
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id // Assuming user ID is available in request after authentication
            };
            const user = await this.userService.createUser(userData, requestContext);
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: user
            });
        }
        catch (error) {
            const safeBody = req?.body;
            (0, error_1.logErrorContext)('user.create.error', error, { username: safeBody?.username, email: 'redacted' });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.create,
                entityType: 'user',
                errorKey: 'create_user_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                newData: { username: safeBody?.username, email: safeBody?.email, fullName: safeBody?.fullName }
            });
            res.status(500).json({
                success: false,
                message: 'Failed to create user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
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
            const requestContext = {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                userId: req.userId ?? req.user?.id
            };
            const user = await this.userService.updateUser(userId, userData, requestContext);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json(user);
        }
        catch (error) {
            const idParam = parseInt(req.params.id, 10);
            (0, error_1.logErrorContext)('user.update.error', error, { id: idParam });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.update,
                entityType: 'user',
                entityId: isNaN(idParam) ? undefined : idParam,
                errorKey: 'update_user_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
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
            const requestContext = {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                userId: req.userId ?? req.user?.id
            };
            await this.userService.deleteUser(userId, requestContext);
            res.status(204).send();
        }
        catch (error) {
            const idParam = parseInt(req.params.id, 10);
            (0, error_1.logErrorContext)('user.delete.error', error, { id: idParam });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.delete,
                entityType: 'user',
                entityId: isNaN(idParam) ? undefined : idParam,
                errorKey: 'delete_user_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }
    /**
     * Authenticate user (login)
     */
    async login(req, res) {
        try {
            const { email, password } = req.body || {};
            // Basic presence validation
            const missingErrors = {};
            if (!email || typeof email !== 'string' || email.trim().length === 0) {
                missingErrors.email = 'Email is required';
            }
            if (!password || typeof password !== 'string' || password.length === 0) {
                missingErrors.password = 'Password is required';
            }
            if (Object.keys(missingErrors).length > 0) {
                (0, error_1.logErrorContext)('login.invalid_request', new Error('Missing credentials'), { missing: missingErrors });
                (0, error_1.sendSafeError)(res, 'INVALID_REQUEST');
                return;
            }
            // Format validation
            const validation = (0, user_validation_1.validateLogin)({ email, password });
            if (!validation.isValid) {
                (0, error_1.logErrorContext)('login.validation_failed', new Error('Validation failed'), { errors: validation.errors });
                (0, error_1.sendSafeError)(res, 'INVALID_REQUEST');
                return;
            }
            const requestContext = {
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
            };
            const user = await this.userService.authenticateUser({ email, password }, requestContext);
            if (!user) {
                (0, error_1.logErrorContext)('login.invalid_credentials', 'Invalid email or password', { email: 'redacted' });
                (0, error_1.sendSafeError)(res, 'INVALID_CREDENTIALS');
                return;
            }
            // Generate JWT token with minimal payload and secure options
            try {
                const auth = (0, jwt_1.generateAccessToken)({
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                });
                // Persist the authentication session (token, IP, User-Agent, expiration)
                await this.userService.createUserSession(user.id, auth.token, requestContext);
                // Compose response in requested format, excluding sensitive fields
                const responsePayload = {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        fullName: user.fullName,
                        role: String(user.role),
                        avatarType: String(user.avatarType),
                        profileImageUrl: user.profileImageUrl ?? null,
                    },
                    token: auth.token,
                    expiresIn: auth.expiresIn,
                    message: 'Inicio de sesión exitoso',
                };
                // Do not log the token
                res.status(200).json(responsePayload);
            }
            catch (err) {
                if (err instanceof jwt_1.JWTConfigError) {
                    await (0, error_1.respondWithSafeErrorAndAudit)(res, 'INTERNAL_ERROR', {
                        action: client_1.AuditAction.failed_login,
                        entityType: 'user',
                        userId: user.id,
                        entityId: user.id,
                        ipAddress: requestContext.ipAddress,
                        userAgent: requestContext.userAgent,
                        errorKey: 'server_config_error',
                    }, { logTag: 'login.jwt_config_error', error: err });
                    return;
                }
                await (0, error_1.respondWithSafeErrorAndAudit)(res, 'INTERNAL_ERROR', {
                    action: client_1.AuditAction.failed_login,
                    entityType: 'user',
                    userId: user.id,
                    entityId: user.id,
                    ipAddress: requestContext.ipAddress,
                    userAgent: requestContext.userAgent,
                    errorKey: 'login_error',
                }, { logTag: 'login.error', error: err });
                return;
            }
        }
        catch (error) {
            // Handle temporary account lock explicitly
            if (error instanceof Error && (error.message === 'ACCOUNT_LOCKED' || error.name === 'AccountLockedError')) {
                (0, error_1.logErrorContext)('login.account_locked', error);
                (0, error_1.sendSafeError)(res, 'ACCOUNT_BLOCKED');
                return;
            }
            await (0, error_1.respondWithSafeErrorAndAudit)(res, 'INTERNAL_ERROR', {
                action: client_1.AuditAction.failed_login,
                entityType: 'user',
                errorKey: 'login_exception',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            }, { logTag: 'login.exception', error });
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
            const idParam = parseInt(req.params.id, 10);
            (0, error_1.logErrorContext)('user.password_change.error', error, { id: idParam });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.password_change,
                entityType: 'user',
                entityId: isNaN(idParam) ? undefined : idParam,
                errorKey: 'password_change_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
            res.status(500).json({ error: 'Failed to change password' });
        }
    }
    /**
     * Register a new user with comprehensive validation
     */
    async register(req, res) {
        try {
            const registrationData = req.body;
            // Extract request context for audit logging
            const requestContext = {
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id // Assuming user ID is available in request after authentication
            };
            // Use the comprehensive registration method from the service
            const response = await this.userService.registerUser(registrationData, requestContext);
            // Set appropriate HTTP status code based on response
            if (response.success) {
                res.status(201).json(response);
            }
            else {
                // Determine appropriate status code based on error type
                let statusCode = 400; // Default for validation errors
                // Check if it's a duplicate credential error
                if (response.errors?.username?.includes('already exists') ||
                    response.errors?.email?.includes('already exists')) {
                    statusCode = 409; // Conflict
                }
                res.status(statusCode).json(response);
            }
        }
        catch (error) {
            const safeBody = req?.body;
            (0, error_1.logErrorContext)('user.register.error', error, { username: safeBody?.username, email: 'redacted' });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.create,
                entityType: 'user',
                errorKey: 'register_user_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                newData: { username: safeBody?.username, email: safeBody?.email, fullName: safeBody?.fullName }
            });
            const response = {
                success: false,
                message: 'Failed to register user',
                errors: {
                    general: error instanceof Error ? error.message : 'Unknown error occurred'
                }
            };
            res.status(500).json(response);
        }
    }
}
exports.UserController = UserController;
