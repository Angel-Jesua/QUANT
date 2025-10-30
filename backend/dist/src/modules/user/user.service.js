"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const password_1 = require("../../utils/password");
const user_validation_1 = require("./user.validation");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
     * Check if username and/or email already exist in the database
     * @param username - Username to check (optional)
     * @param email - Email to check (optional)
     * @param excludeUserId - User ID to exclude from the check (for updates)
     * @returns ICredentialUniquenessResult - Result indicating uniqueness and any errors
     */
    async checkCredentialUniqueness(username, email, excludeUserId) {
        const errors = {};
        // Check username uniqueness if provided
        if (username) {
            const existingUsername = await prisma.userAccount.findFirst({
                where: {
                    username: username,
                    ...(excludeUserId && { id: { not: excludeUserId } })
                }
            });
            if (existingUsername) {
                errors.username = 'Username already exists';
            }
        }
        // Check email uniqueness if provided
        if (email) {
            const existingEmail = await prisma.userAccount.findFirst({
                where: {
                    email: email,
                    ...(excludeUserId && { id: { not: excludeUserId } })
                }
            });
            if (existingEmail) {
                errors.email = 'Email already exists';
            }
        }
        return {
            isUnique: Object.keys(errors).length === 0,
            errors
        };
    }
    /**
     * Create a new user with comprehensive validation and audit logging
     */
    async createUser(userData, requestContext) {
        // Check credential uniqueness before creating user
        const uniquenessCheck = await this.checkCredentialUniqueness(userData.username, userData.email);
        if (!uniquenessCheck.isUnique) {
            const errorMessages = Object.values(uniquenessCheck.errors).join(', ');
            throw new Error(`Credential validation failed: ${errorMessages}`);
        }
        // Hash the password before storing it
        const passwordHash = await (0, password_1.hashPassword)(userData.password);
        try {
            // Create user with default values as specified in the model
            const user = await prisma.userAccount.create({
                data: {
                    username: userData.username,
                    email: userData.email,
                    passwordHash: passwordHash,
                    fullName: userData.fullName,
                    role: userData.role || client_1.UserRole.accountant, // Default role
                    avatarType: client_1.AvatarType.generated, // Default avatar type
                    photoRequested: true, // Default value
                    isActive: true, // Default value
                    passwordChangedAt: new Date(), // Set when password is created
                    // Self-referencing relationships
                    ...(requestContext?.userId && { createdById: requestContext.userId }),
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
            // Log the user creation in the audit log
            await prisma.userAuditLog.create({
                data: {
                    userId: user.id,
                    action: client_1.AuditAction.create,
                    entityType: 'user',
                    entityId: user.id,
                    newData: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                        isActive: user.isActive,
                        avatarType: user.avatarType,
                        photoRequested: true
                    },
                    ipAddress: requestContext?.ipAddress,
                    userAgent: requestContext?.userAgent,
                    success: true,
                    performedAt: new Date()
                }
            });
            return {
                ...user,
                profileImageUrl: user.profileImageUrl || undefined,
                lastLogin: user.lastLogin || undefined,
            };
        }
        catch (error) {
            // Log failed user creation attempt
            try {
                await prisma.userAuditLog.create({
                    data: {
                        action: client_1.AuditAction.create,
                        entityType: 'user',
                        newData: {
                            username: userData.username,
                            email: userData.email,
                            fullName: userData.fullName,
                            role: userData.role || client_1.UserRole.accountant
                        },
                        ipAddress: requestContext?.ipAddress,
                        userAgent: requestContext?.userAgent,
                        success: false,
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        performedAt: new Date()
                    }
                });
            }
            catch (auditError) {
                console.error('Failed to log audit entry:', auditError);
            }
            throw error;
        }
    }
    /**
     * Update user
     */
    async updateUser(id, userData) {
        // Check credential uniqueness if username or email is being updated
        if (userData.username || userData.email) {
            const uniquenessCheck = await this.checkCredentialUniqueness(userData.username, userData.email, id);
            if (!uniquenessCheck.isUnique) {
                const errorMessages = Object.values(uniquenessCheck.errors).join(', ');
                throw new Error(`Credential validation failed: ${errorMessages}`);
            }
        }
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
    async authenticateUser(loginData, requestContext) {
        try {
            // Find active user by email
            const user = await prisma.userAccount.findFirst({
                where: { email: loginData.email, isActive: true },
            });
            // Do not reveal whether the email exists; log failed attempt without userId
            if (!user) {
                try {
                    await prisma.userAuditLog.create({
                        data: {
                            action: client_1.AuditAction.failed_login,
                            entityType: 'user',
                            ipAddress: requestContext?.ipAddress,
                            userAgent: requestContext?.userAgent,
                            success: false,
                            errorMessage: 'user_not_found',
                            performedAt: new Date(),
                        },
                    });
                }
                catch (auditError) {
                    console.error('Failed to log audit entry (user not found):', auditError);
                }
                return null;
            }
            // 1) Pre-lock verification: stop flow if currently locked
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                // Log failed login due to account lock
                try {
                    await prisma.userAuditLog.create({
                        data: {
                            userId: user.id,
                            action: client_1.AuditAction.failed_login,
                            entityType: 'user',
                            entityId: user.id,
                            ipAddress: requestContext?.ipAddress,
                            userAgent: requestContext?.userAgent,
                            success: false,
                            errorMessage: 'account_locked',
                            performedAt: new Date(),
                        },
                    });
                }
                catch (auditError) {
                    console.error('Failed to log audit entry (account locked):', auditError);
                }
                const err = new Error('ACCOUNT_LOCKED');
                err.name = 'AccountLockedError';
                throw err;
            }
            // 2) Compare password using bcrypt (via comparePassword wrapper)
            const isPasswordValid = await (0, password_1.comparePassword)(loginData.password, user.passwordHash);
            if (!isPasswordValid) {
                // Increment attempts and possibly set a temporary lock atomically; also write audit log
                const now = new Date();
                const LOCK_THRESHOLD = 5;
                const LOCK_DURATION_MS = 15 * 60 * 1000;
                await prisma.$transaction(async (tx) => {
                    // Re-read attempts inside the transaction to prevent race conditions
                    const current = await tx.userAccount.findUnique({
                        where: { id: user.id },
                        select: { failedLoginAttempts: true, lockedUntil: true },
                    });
                    const currentAttempts = current?.failedLoginAttempts ?? 0;
                    const nextAttempts = currentAttempts + 1;
                    const updateData = { failedLoginAttempts: nextAttempts };
                    if (nextAttempts === LOCK_THRESHOLD) {
                        updateData.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
                    }
                    await tx.userAccount.update({
                        where: { id: user.id },
                        data: updateData,
                    });
                    await tx.userAuditLog.create({
                        data: {
                            userId: user.id,
                            action: client_1.AuditAction.failed_login,
                            entityType: 'user',
                            entityId: user.id,
                            ipAddress: requestContext?.ipAddress,
                            userAgent: requestContext?.userAgent,
                            success: false,
                            errorMessage: 'invalid_password',
                            performedAt: now,
                        },
                    });
                });
                // Signal invalid credentials without user enumeration
                return null;
            }
            // 2b) On success: reset counters, clear lock and update lastLogin/lastActivity
            const now = new Date();
            await prisma.userAccount.update({
                where: { id: user.id },
                data: {
                    lastLogin: now,
                    lastActivity: now,
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                },
            });
            // Log successful login
            try {
                await prisma.userAuditLog.create({
                    data: {
                        userId: user.id,
                        action: client_1.AuditAction.login,
                        entityType: 'user',
                        entityId: user.id,
                        ipAddress: requestContext?.ipAddress,
                        userAgent: requestContext?.userAgent,
                        success: true,
                        performedAt: now,
                    },
                });
            }
            catch (auditError) {
                console.error('Failed to log audit entry (login):', auditError);
            }
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
                lastLogin: now,
            };
        }
        catch (error) {
            // 3) Map account lock errors to controller (403)
            if (error instanceof Error && (error.message === 'ACCOUNT_LOCKED' || error.name === 'AccountLockedError')) {
                throw error;
            }
            console.error('Error authenticating user:', error);
            return null;
        }
    }
    /**
     * Create and persist a user authentication session
     * Stores JWT token and context, computes expiresAt from token's exp claim
     */
    async createUserSession(userId, token, requestContext) {
        const now = new Date();
        let expiresAt = new Date(now.getTime());
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && typeof decoded === 'object' && typeof decoded.exp === 'number') {
                expiresAt = new Date(decoded.exp * 1000);
            }
            else {
                // Fallback: 1 hour from now if exp is unavailable
                expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
            }
        }
        catch {
            // Fallback: 1 hour from now on decode error
            expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
        }
        const session = await prisma.userSession.create({
            data: {
                userId,
                token,
                ipAddress: requestContext?.ipAddress,
                userAgent: requestContext?.userAgent,
                isActive: true,
                expiresAt,
                lastActivity: now,
            },
            select: {
                id: true,
                userId: true,
                token: true,
                ipAddress: true,
                userAgent: true,
                isActive: true,
                expiresAt: true,
                lastActivity: true,
                createdAt: true,
            },
        });
        // Map nullable DB fields to optional properties to satisfy IUserSession
        return {
            ...session,
            ipAddress: session.ipAddress ?? undefined,
            userAgent: session.userAgent ?? undefined,
        };
    }
    /**
     * Comprehensive user registration method that handles all validation steps
     * @param registrationData - Complete registration data including password confirmation
     * @param requestContext - Request context for audit logging
     * @returns Promise<IRegistrationResponse> - Registration response with user data or errors
     */
    async registerUser(registrationData, requestContext) {
        try {
            // Validate registration data
            const validation = (0, user_validation_1.validateRegisterUser)(registrationData);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Registration failed due to validation errors',
                    errors: validation.errors
                };
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
            const uniquenessCheck = await this.checkCredentialUniqueness(userData.username, userData.email);
            if (!uniquenessCheck.isUnique) {
                return {
                    success: false,
                    message: 'Registration failed due to duplicate credentials',
                    errors: uniquenessCheck.errors
                };
            }
            // Create the user with all defaults and audit logging
            const user = await this.createUser(userData, requestContext);
            return {
                success: true,
                message: 'User registered successfully',
                user: user
            };
        }
        catch (error) {
            console.error('Error during user registration:', error);
            // Log failed registration attempt
            try {
                await prisma.userAuditLog.create({
                    data: {
                        action: client_1.AuditAction.create,
                        entityType: 'user',
                        newData: {
                            username: registrationData.username,
                            email: registrationData.email,
                            fullName: registrationData.fullName
                        },
                        ipAddress: requestContext?.ipAddress,
                        userAgent: requestContext?.userAgent,
                        success: false,
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        performedAt: new Date()
                    }
                });
            }
            catch (auditError) {
                console.error('Failed to log audit entry:', auditError);
            }
            return {
                success: false,
                message: 'Failed to register user',
                errors: {
                    general: error instanceof Error ? error.message : 'Unknown error occurred'
                }
            };
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
            const isCurrentPasswordValid = await (0, password_1.comparePassword)(currentPassword, user.passwordHash);
            if (!isCurrentPasswordValid) {
                return false;
            }
            // Hash new password
            const newPasswordHash = await (0, password_1.hashPassword)(newPassword);
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
