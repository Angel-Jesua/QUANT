import { Request, Response } from 'express';
import { UserService } from './user.service';
import { ICreateUser, IUpdateUser, ILoginUser, IRegisterUser, IRegistrationResponse } from './user.types';
import { validatePasswordStrength } from '../../utils/password';
import {
  validateCreateUser,
  validateRegisterUser,
  validateUpdateUser,
  validateLogin
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
      
      // Validate user data
      const validation = validateCreateUser(userData);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }

      const user = await this.userService.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
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

      // Validate user data
      const validation = validateUpdateUser(userData);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
        return;
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
      
      // Validate registration data
      const validation = validateRegisterUser(registrationData);
      if (!validation.isValid) {
        const response: IRegistrationResponse = {
          success: false,
          message: 'Registration failed due to validation errors',
          errors: validation.errors
        };
        res.status(400).json(response);
        return;
      }

      // Extract user creation data from registration data
      const userData: ICreateUser = {
        username: registrationData.username,
        email: registrationData.email,
        password: registrationData.password,
        fullName: registrationData.fullName,
        role: registrationData.role
      };

      const user = await this.userService.createUser(userData);
      
      const response: IRegistrationResponse = {
        success: true,
        message: 'User registered successfully',
        user: user
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error during registration:', error);
      
      // Handle unique constraint violations
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        const response: IRegistrationResponse = {
          success: false,
          message: 'Registration failed',
          errors: {
            general: 'Username or email already exists'
          }
        };
        res.status(409).json(response);
        return;
      }
      
      const response: IRegistrationResponse = {
        success: false,
        message: 'Failed to register user'
      };
      res.status(500).json(response);
    }
  }
}