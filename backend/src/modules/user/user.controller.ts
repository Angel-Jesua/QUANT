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

export class UserController {
  private userService = new UserService();

  /**
   * Get all users
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
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
      console.error('Error creating user:', error);
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

      const user = await this.userService.updateUser(userId, userData);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
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

      await this.userService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  /**
   * Authenticate user (login)
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: ILoginUser = req.body;
      
      // Validate login data
      const validation = validateLogin(loginData);
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
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Failed to authenticate user' });
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
      console.error('Error changing password:', error);
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
      console.error('Error during registration:', error);
      
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
}