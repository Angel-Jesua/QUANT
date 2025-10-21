import { PrismaClient } from '@prisma/client';
import { ICreateUser, IUpdateUser, IUserResponse, ILoginUser } from './user.types';
import { hashPassword, comparePassword } from '../../utils/password';

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
   * Create a new user
   */
  async createUser(userData: ICreateUser): Promise<IUserResponse> {
    // Hash the password before storing it
    const passwordHash = await hashPassword(userData.password);
    
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
  async updateUser(id: number, userData: IUpdateUser): Promise<IUserResponse | null> {
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