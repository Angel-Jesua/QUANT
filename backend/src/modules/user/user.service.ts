import { PrismaClient, UserRole, AvatarType, AuditAction } from '@prisma/client';
import { ICreateUser, IUpdateUser, IUserResponse, ILoginUser, ICredentialUniquenessResult, IRegisterUser, IRegistrationResponse } from './user.types';
import { hashPassword, comparePassword } from '../../utils/password';
import { validateRegisterUser } from './user.validation';

const prisma = new PrismaClient();

export class UserService {
  /**
   * Get all users
   */
  async getAllUsers(): Promise<IUserResponse[]> {
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
  async getUserById(id: number): Promise<IUserResponse | null> {
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
  async checkCredentialUniqueness(
    username?: string,
    email?: string,
    excludeUserId?: number
  ): Promise<ICredentialUniquenessResult> {
    const errors: { username?: string; email?: string } = {};
    
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
  async createUser(userData: ICreateUser, requestContext?: { ipAddress?: string; userAgent?: string; userId?: number }): Promise<IUserResponse> {
    // Check credential uniqueness before creating user
    const uniquenessCheck = await this.checkCredentialUniqueness(userData.username, userData.email);
    
    if (!uniquenessCheck.isUnique) {
      const errorMessages = Object.values(uniquenessCheck.errors).join(', ');
      throw new Error(`Credential validation failed: ${errorMessages}`);
    }
    
    // Hash the password before storing it
    const passwordHash = await hashPassword(userData.password);
    
    try {
      // Create user with default values as specified in the model
      const user = await prisma.userAccount.create({
        data: {
          username: userData.username,
          email: userData.email,
          passwordHash: passwordHash,
          fullName: userData.fullName,
          role: userData.role || UserRole.accountant, // Default role
          avatarType: AvatarType.generated, // Default avatar type
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
          action: AuditAction.create,
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
    } catch (error) {
      // Log failed user creation attempt
      try {
        await prisma.userAuditLog.create({
          data: {
            action: AuditAction.create,
            entityType: 'user',
            newData: {
              username: userData.username,
              email: userData.email,
              fullName: userData.fullName,
              role: userData.role || UserRole.accountant
            },
            ipAddress: requestContext?.ipAddress,
            userAgent: requestContext?.userAgent,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            performedAt: new Date()
          }
        });
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError);
      }
      
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(id: number, userData: IUpdateUser): Promise<IUserResponse | null> {
    // Check credential uniqueness if username or email is being updated
    if (userData.username || userData.email) {
      const uniquenessCheck = await this.checkCredentialUniqueness(
        userData.username,
        userData.email,
        id
      );
      
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
  async deleteUser(id: number): Promise<boolean> {
    await prisma.userAccount.update({
      where: { id },
      data: { isActive: false },
    });

    return true;
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(loginData: ILoginUser): Promise<IUserResponse | null> {
    try {
      // Find user by email
      const user = await prisma.userAccount.findUnique({
        where: { email: loginData.email },
      });

      if (!user || !user.isActive) {
        return null;
      }

      // Compare passwords
      const isPasswordValid = await comparePassword(loginData.password, user.passwordHash);
      
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
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  /**
   * Comprehensive user registration method that handles all validation steps
   * @param registrationData - Complete registration data including password confirmation
   * @param requestContext - Request context for audit logging
   * @returns Promise<IRegistrationResponse> - Registration response with user data or errors
   */
  async registerUser(
    registrationData: IRegisterUser,
    requestContext?: { ipAddress?: string; userAgent?: string; userId?: number }
  ): Promise<IRegistrationResponse> {
    try {
      // Validate registration data
      const validation = validateRegisterUser(registrationData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Registration failed due to validation errors',
          errors: validation.errors
        };
      }

      // Extract user creation data from registration data
      const userData: ICreateUser = {
        username: registrationData.username,
        email: registrationData.email,
        password: registrationData.password,
        fullName: registrationData.fullName,
        role: registrationData.role
      };
      
      // Check credential uniqueness
      const uniquenessCheck = await this.checkCredentialUniqueness(
        userData.username,
        userData.email
      );
      
      if (!uniquenessCheck.isUnique) {
        return {
          success: false,
          message: 'Registration failed due to duplicate credentials',
          errors: uniquenessCheck.errors as any
        };
      }

      // Create the user with all defaults and audit logging
      const user = await this.createUser(userData, requestContext);
      
      return {
        success: true,
        message: 'User registered successfully',
        user: user
      };
    } catch (error) {
      console.error('Error during user registration:', error);
      
      // Log failed registration attempt
      try {
        await prisma.userAuditLog.create({
          data: {
            action: AuditAction.create,
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
      } catch (auditError) {
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
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Find user
      const user = await prisma.userAccount.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return false;
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
      
      if (!isCurrentPasswordValid) {
        return false;
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await prisma.userAccount.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }
}