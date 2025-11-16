import { Request, Response } from 'express';
import { UserService } from './user.service';
import { ICreateUser, IUpdateUser, ILoginUser, IRegisterUser, IRegistrationResponse } from './user.types';
import { validatePasswordStrength } from '../../utils/password';
import {
  validateCreateUser,
  validateRegisterUser,
  validateUpdateUser,
  validateLogin,
  validateCreateUserWithUniqueness,
  validateUpdateUserWithUniqueness
} from './user.validation';
import { generateAccessToken, JWTConfigError } from '../../utils/jwt';
import { sendSafeError, respondWithSafeErrorAndAudit, logErrorContext, logAuditError } from '../../utils/error';
import { AuditAction } from '@prisma/client';

export class UserController {
  private userService = new UserService();
  private static getRequestUserId(req: Request): number | undefined {
    return (req as Request & { userId?: number }).userId;
  }

  /**
   * Get all users
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      res.json(users);
    } catch (error) {
      logErrorContext('user.getAll.error', error, { ip: req.ip || (req as any).connection?.remoteAddress, ua: req.get('User-Agent') });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'user',
        errorKey: 'fetch_users_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      logErrorContext('user.getById.error', error, { id: req.params.id });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'user',
        entityId: parseInt(req.params.id, 10),
        errorKey: 'fetch_user_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  /**
   * Get authenticated user profile using the JWT context
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = UserController.getRequestUserId(req);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.userService.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      logErrorContext('user.me.error', error, { userId: UserController.getRequestUserId(req) });
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  /**
   * Create a new user
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: ICreateUser = req.body;
      
      // First, validate basic user data
      const basicValidation = validateCreateUser(userData);
      if (!basicValidation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: basicValidation.errors
        });
        return;
      }
      
      // Check credential uniqueness
      const uniquenessCheck = await this.userService.checkCredentialUniqueness(
        userData.username,
        userData.email
      );
      
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
        userId: (req as any).user?.id // Assuming user ID is available in request after authentication
      };

      const user = await this.userService.createUser(userData, requestContext);
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    } catch (error) {
      const safeBody = req?.body as Partial<ICreateUser> | undefined;
      logErrorContext('user.create.error', error, { username: safeBody?.username, email: 'redacted' });
      await logAuditError({
        action: AuditAction.create,
        entityType: 'user',
        errorKey: 'create_user_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
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
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      const userData: IUpdateUser = req.body;
      
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // First, validate basic user data
      const basicValidation = validateUpdateUser(userData);
      if (!basicValidation.isValid) {
        res.status(400).json({
          error: 'Validation failed',
          details: basicValidation.errors
        });
        return;
      }
      
      // Check credential uniqueness if username or email is being updated
      if (userData.username || userData.email) {
        const uniquenessCheck = await this.userService.checkCredentialUniqueness(
          userData.username,
          userData.email,
          userId
        );
        
        if (!uniquenessCheck.isUnique) {
          res.status(409).json({
            error: 'Validation failed',
            details: uniquenessCheck.errors
          });
          return;
        }
      }

      const requestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: (req as any).userId ?? (req as any).user?.id
      };
      const user = await this.userService.updateUser(userId, userData, requestContext);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      const idParam = parseInt(req.params.id, 10);
      logErrorContext('user.update.error', error, { id: idParam });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'user',
        entityId: isNaN(idParam) ? undefined : idParam,
        errorKey: 'update_user_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const requestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: (req as any).userId ?? (req as any).user?.id
      };
      await this.userService.deleteUser(userId, requestContext);
      res.status(204).send();
    } catch (error) {
      const idParam = parseInt(req.params.id, 10);
      logErrorContext('user.delete.error', error, { id: idParam });
      await logAuditError({
        action: AuditAction.delete,
        entityType: 'user',
        entityId: isNaN(idParam) ? undefined : idParam,
        errorKey: 'delete_user_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  /**
   * Authenticate user (login)
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body || {};

      // Basic presence validation
      const missingErrors: { email?: string; password?: string } = {};
      if (!email || typeof email !== 'string' || email.trim().length === 0) {
        missingErrors.email = 'Email is required';
      }
      if (!password || typeof password !== 'string' || password.length === 0) {
        missingErrors.password = 'Password is required';
      }
      if (Object.keys(missingErrors).length > 0) {
        logErrorContext('login.invalid_request', new Error('Missing credentials'), { missing: missingErrors });
        sendSafeError(res, 'INVALID_REQUEST');
        return;
      }

      // Format validation
      const validation = validateLogin({ email, password });
      if (!validation.isValid) {
        logErrorContext('login.validation_failed', new Error('Validation failed'), { errors: validation.errors });
        sendSafeError(res, 'INVALID_REQUEST');
        return;
      }

      const requestContext = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
      };
      const user = await this.userService.authenticateUser({ email, password }, requestContext);
      
      if (!user) {
        logErrorContext('login.invalid_credentials', 'Invalid email or password', { email: 'redacted' });
        sendSafeError(res, 'INVALID_CREDENTIALS');
        return;
      }

      // Generate JWT token with minimal payload and secure options
      try {
        const auth = generateAccessToken({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        });

        // Persist the authentication session (token, IP, User-Agent, expiration)
        await this.userService.createUserSession(
          user.id,
          auth.token,
          requestContext
        );

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
            profileImageStatus: user.profileImageStatus,
          },
          token: auth.token,
          expiresIn: auth.expiresIn,
          message: 'Inicio de sesión exitoso',
        };

        // Do not log the token
        res.status(200).json(responsePayload);
      } catch (err) {
        if (err instanceof JWTConfigError) {
          await respondWithSafeErrorAndAudit(res, 'INTERNAL_ERROR', {
            action: AuditAction.failed_login,
            entityType: 'user',
            userId: user.id,
            entityId: user.id,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            errorKey: 'server_config_error',
          }, { logTag: 'login.jwt_config_error', error: err });
          return;
        }
        await respondWithSafeErrorAndAudit(res, 'INTERNAL_ERROR', {
          action: AuditAction.failed_login,
          entityType: 'user',
          userId: user.id,
          entityId: user.id,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          errorKey: 'login_error',
        }, { logTag: 'login.error', error: err });
        return;
      }
    } catch (error) {
      // Handle temporary account lock explicitly
      if (error instanceof Error && (error.message === 'ACCOUNT_LOCKED' || error.name === 'AccountLockedError')) {
        logErrorContext('login.account_locked', error);
        sendSafeError(res, 'ACCOUNT_BLOCKED');
        return;
      }
      await respondWithSafeErrorAndAudit(res, 'INTERNAL_ERROR', {
        action: AuditAction.failed_login,
        entityType: 'user',
        errorKey: 'login_exception',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      }, { logTag: 'login.exception', error });
    }
  }

  /**
   * Change user password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
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
      const passwordValidation = validatePasswordStrength(newPassword);
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
    } catch (error) {
      const idParam = parseInt(req.params.id, 10);
      logErrorContext('user.password_change.error', error, { id: idParam });
      await logAuditError({
        action: AuditAction.password_change,
        entityType: 'user',
        entityId: isNaN(idParam) ? undefined : idParam,
        errorKey: 'password_change_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({ error: 'Failed to change password' });
    }
  }

  /**
   * Register a new user with comprehensive validation
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const registrationData: IRegisterUser = req.body;
      
      // Extract request context for audit logging
      const requestContext = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id // Assuming user ID is available in request after authentication
      };

      // Use the comprehensive registration method from the service
      const response = await this.userService.registerUser(registrationData, requestContext);
      
      // Set appropriate HTTP status code based on response
      if (response.success) {
        res.status(201).json(response);
      } else {
        // Determine appropriate status code based on error type
        let statusCode = 400; // Default for validation errors
        
        // Check if it's a duplicate credential error
        if (response.errors?.username?.includes('already exists') ||
            response.errors?.email?.includes('already exists')) {
          statusCode = 409; // Conflict
        }
        
        res.status(statusCode).json(response);
      }
    } catch (error) {
      const safeBody = req?.body as Partial<IRegisterUser> | undefined;
      logErrorContext('user.register.error', error, { username: safeBody?.username, email: 'redacted' });
      await logAuditError({
        action: AuditAction.create,
        entityType: 'user',
        errorKey: 'register_user_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        newData: { username: safeBody?.username, email: safeBody?.email, fullName: safeBody?.fullName }
      });

      const response: IRegistrationResponse = {
        success: false,
        message: 'Failed to register user',
        errors: {
          general: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
      res.status(500).json(response);
    }
  }

  /**
   * Upload profile image for a user
   */
  async uploadProfileImage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      // Get the relative path for storage
      const imagePath = `images/profile/${req.file.filename}`;
      
      const requestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: UserController.getRequestUserId(req)
      };

      const updatedUser = await this.userService.uploadProfileImage(userId, imagePath, requestContext);
      
      if (!updatedUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(updatedUser);
    } catch (error) {
      const idParam = parseInt(req.params.id, 10);
      logErrorContext('user.upload_image.error', error, { id: idParam });
      await logAuditError({
        action: AuditAction.photo_upload,
        entityType: 'user',
        entityId: isNaN(idParam) ? undefined : idParam,
        errorKey: 'upload_image_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({ error: 'Failed to upload profile image' });
    }
  }
}