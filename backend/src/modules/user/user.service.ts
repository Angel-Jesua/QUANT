import { PrismaClient, Prisma, UserRole, AvatarType, AuditAction } from '@prisma/client';
import { ICreateUser, IUpdateUser, IUserResponse, ILoginUser, ICredentialUniquenessResult, IRegisterUser, IRegistrationResponse, IUserSession, ProfileImageStatus } from './user.types';
import { hashPassword, comparePassword } from '../../utils/password';
import { validateRegisterUser } from './user.validation';
import jwt from 'jsonwebtoken';
import { resolveProfileImageMeta } from './profile-image.util';

const prisma = new PrismaClient();

const USER_RESPONSE_SELECT = {
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
} as const;

type SelectedUser = Prisma.UserAccountGetPayload<{ select: typeof USER_RESPONSE_SELECT }>;

function mapStatusToAvatarType(status: ProfileImageStatus): AvatarType {
  return status === 'custom' ? AvatarType.uploaded : AvatarType.generated;
}

function mapUserRecord(user: SelectedUser | null): IUserResponse | null {
  if (!user) {
    return null;
  }

  const profileMeta = resolveProfileImageMeta(user.profileImageUrl);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    avatarType: user.avatarType,
    profileImageUrl: profileMeta.path ?? undefined,
    profileImageStatus: profileMeta.status,
    lastLogin: user.lastLogin ?? undefined,
  };
}

function mapUserList(users: SelectedUser[]): IUserResponse[] {
  return users.map((user) => mapUserRecord(user)!).filter((item): item is IUserResponse => Boolean(item));
}

export class UserService {
  /**
   * Get all users
   */
  async getAllUsers(): Promise<IUserResponse[]> {
    const users = await prisma.userAccount.findMany({
      select: USER_RESPONSE_SELECT,
    });

    return mapUserList(users);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<IUserResponse | null> {
    const user = await prisma.userAccount.findUnique({
      where: { id },
      select: USER_RESPONSE_SELECT,
    });

    return mapUserRecord(user);
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
      const profileMeta = resolveProfileImageMeta(
        userData.profileImageUrl,
        { fallbackToDefault: userData.profileImageUrl !== null }
      );
      const avatarType = mapStatusToAvatarType(profileMeta.status);

      // Create user with default values as specified in the model
      const user = await prisma.userAccount.create({
        data: {
          username: userData.username,
          email: userData.email,
          passwordHash: passwordHash,
          fullName: userData.fullName,
          role: userData.role || UserRole.accountant, // Default role
          avatarType,
          profileImageUrl: profileMeta.path,
          photoRequested: true, // Default value
          isActive: true, // Default value
          passwordChangedAt: new Date(), // Set when password is created
          // Self-referencing relationships
          ...(requestContext?.userId && { createdById: requestContext.userId }),
        },
        select: USER_RESPONSE_SELECT,
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
            photoRequested: true,
            profileImageUrl: profileMeta.path,
            profileImageStatus: profileMeta.status,
          },
          ipAddress: requestContext?.ipAddress,
          userAgent: requestContext?.userAgent,
          success: true,
          performedAt: new Date()
        }
      });

      return mapUserRecord(user)!;
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
  async updateUser(
    id: number,
    userData: IUpdateUser,
    requestContext?: { ipAddress?: string; userAgent?: string; userId?: number }
  ): Promise<IUserResponse | null> {
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
    
    const { profileImageUrl, ...otherFields } = userData;
    const updateData: Prisma.UserAccountUpdateInput = {
      ...otherFields,
      ...(requestContext?.userId && { updatedById: requestContext.userId }),
    };

    if (profileImageUrl !== undefined) {
      const profileMeta = resolveProfileImageMeta(
        profileImageUrl,
        { fallbackToDefault: profileImageUrl !== null }
      );
      updateData.profileImageUrl = profileMeta.path;
      updateData.avatarType = mapStatusToAvatarType(profileMeta.status);
      
      // Set photoUploadedAt when uploading a custom profile image
      if (profileMeta.status === 'custom' && profileImageUrl) {
        updateData.photoUploadedAt = new Date();
        updateData.photoRequested = false;
      }
    }

    const user = await prisma.userAccount.update({
      where: { id },
      data: updateData,
      select: USER_RESPONSE_SELECT,
    });

    return mapUserRecord(user);
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   */
  async deleteUser(
    id: number,
    requestContext?: { ipAddress?: string; userAgent?: string; userId?: number }
  ): Promise<boolean> {
    await prisma.userAccount.update({
      where: { id },
      data: {
        isActive: false,
        ...(requestContext?.userId && { updatedById: requestContext.userId }),
      },
    });
 
    return true;
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(
    loginData: ILoginUser,
    requestContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<IUserResponse | null> {
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
              action: AuditAction.failed_login,
              entityType: 'user',
              ipAddress: requestContext?.ipAddress,
              userAgent: requestContext?.userAgent,
              success: false,
              errorMessage: 'user_not_found',
              performedAt: new Date(),
            },
          });
        } catch (auditError) {
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
              action: AuditAction.failed_login,
              entityType: 'user',
              entityId: user.id,
              ipAddress: requestContext?.ipAddress,
              userAgent: requestContext?.userAgent,
              success: false,
              errorMessage: 'account_locked',
              performedAt: new Date(),
            },
          });
        } catch (auditError) {
          console.error('Failed to log audit entry (account locked):', auditError);
        }
        const err = new Error('ACCOUNT_LOCKED');
        err.name = 'AccountLockedError';
        throw err;
      }

      // 2) Compare password using bcrypt (via comparePassword wrapper)
      const isPasswordValid = await comparePassword(loginData.password, user.passwordHash);

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

          const updateData: any = { failedLoginAttempts: nextAttempts };
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
              action: AuditAction.failed_login,
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
            action: AuditAction.login,
            entityType: 'user',
            entityId: user.id,
            ipAddress: requestContext?.ipAddress,
            userAgent: requestContext?.userAgent,
            success: true,
            performedAt: now,
          },
        });
      } catch (auditError) {
        console.error('Failed to log audit entry (login):', auditError);
      }

      // Return user data without sensitive information
      const profileMeta = resolveProfileImageMeta(user.profileImageUrl);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profileImageUrl: profileMeta.path ?? undefined,
        profileImageStatus: profileMeta.status,
        avatarType: user.avatarType,
        lastLogin: now,
      };
    } catch (error) {
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
  async createUserSession(
    userId: number,
    token: string,
    requestContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<IUserSession> {
    const now = new Date();

    let expiresAt: Date = new Date(now.getTime());
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded && typeof decoded === 'object' && typeof decoded.exp === 'number') {
        expiresAt = new Date(decoded.exp * 1000);
      } else {
        // Fallback: 1 hour from now if exp is unavailable
        expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
      }
    } catch {
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
      throw error;
    }
  }

  /**
   * Upload profile image for a user
   */
  async uploadProfileImage(
    userId: number,
    imagePath: string,
    requestContext?: { ipAddress?: string; userAgent?: string; userId?: number }
  ): Promise<IUserResponse | null> {
    try {
      const updatedUser = await this.updateUser(
        userId,
        { profileImageUrl: imagePath },
        requestContext
      );

      // Log audit entry for photo upload
      try {
        await prisma.userAuditLog.create({
          data: {
            userId,
            action: AuditAction.photo_upload,
            entityType: 'user',
            entityId: userId,
            newData: { profileImageUrl: imagePath },
            ipAddress: requestContext?.ipAddress,
            userAgent: requestContext?.userAgent,
            success: true,
            performedAt: new Date()
          }
        });
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError);
      }

      return updatedUser;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }
}