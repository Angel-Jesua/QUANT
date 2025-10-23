/**
 * Integration-style tests for UserService using Jest module mocks.
 * Verifies:
 * - Database create call structure
 * - Passwords are hashed before storage
 * - Uniqueness constraints respected
 * - Sensitive fields excluded from returned responses
 *
 * These tests mock PrismaClient and password utilities to avoid touching a real DB.
 */

jest.mock('@prisma/client', () => {
  const userAccount = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const userAuditLog = {
    create: jest.fn(),
  };

  class PrismaClient {
    userAccount = userAccount;
    userAuditLog = userAuditLog;
  }

  const __mockPrisma = { userAccount, userAuditLog };

  return {
    PrismaClient,
    // Provide enum values used in service
    UserRole: { administrator: 'administrator', accountant: 'accountant' },
    AvatarType: { generated: 'generated', uploaded: 'uploaded', social: 'social', gravatar: 'gravatar' },
    AuditAction: {
      create: 'create',
      update: 'update',
      delete: 'delete',
      login: 'login',
      logout: 'logout',
      failed_login: 'failed_login',
      password_change: 'password_change',
      photo_upload: 'photo_upload',
      photo_delete: 'photo_delete',
    },
    __mockPrisma,
  };
});

// Mock password utils to produce deterministic hashes
jest.mock('../../utils/password', () => ({
  hashPassword: jest.fn(async (pwd: string) => `hashed:${pwd}`),
  comparePassword: jest.fn(async (pwd: string, hash: string) => hash === `hashed:${pwd}`),
  // Keep other exports unmocked if needed
  generateRandomPassword: jest.requireActual('../../utils/password').generateRandomPassword,
  validatePasswordStrength: jest.requireActual('../../utils/password').validatePasswordStrength,
}));

import { UserService } from './user.service';
import { UserRole } from '@prisma/client';

const { __mockPrisma } = require('@prisma/client');
const { hashPassword } = require('../../utils/password');

describe('UserService - Prisma-mocked integration', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser - success path', () => {
    const now = new Date();

    const validUserData = {
      username: 'svcuser',
      email: 'svcuser@example.com',
      password: 'StrongP@ssw0rd!',
      fullName: 'Service User',
      role: UserRole.accountant,
    };

    it('hashes password and creates user with valid data, excludes sensitive fields', async () => {
      // Uniqueness checks: username and email both unique
      __mockPrisma.userAccount.findFirst
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null); // email check

      // Mock Prisma create to return selected fields
      __mockPrisma.userAccount.create.mockResolvedValue({
        id: 1001,
        username: validUserData.username,
        email: validUserData.email,
        fullName: validUserData.fullName,
        role: UserRole.accountant,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        profileImageUrl: null,
        avatarType: 'generated',
        lastLogin: null,
      });

      // Mock audit log creation success
      __mockPrisma.userAuditLog.create.mockResolvedValue(undefined);

      const result = await service.createUser(validUserData, {
        ipAddress: '10.0.0.1',
        userAgent: 'svc-test-agent',
        userId: 55,
      });

      // Ensure password hashing occurred
      expect(hashPassword).toHaveBeenCalledTimes(1);
      expect(hashPassword).toHaveBeenCalledWith(validUserData.password);

      // Ensure prisma create called with hashed password and no plaintext password
      expect(__mockPrisma.userAccount.create).toHaveBeenCalledTimes(1);
      const createArg = __mockPrisma.userAccount.create.mock.calls[0][0];

      // Validate payload sent to DB
      expect(createArg).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            username: validUserData.username,
            email: validUserData.email,
            passwordHash: `hashed:${validUserData.password}`,
            fullName: validUserData.fullName,
            role: UserRole.accountant,
            avatarType: 'generated',
            photoRequested: true,
            isActive: true,
            passwordChangedAt: expect.any(Date),
            createdById: 55,
          }),
          select: expect.objectContaining({
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
          }),
        })
      );

      // Ensure audit log was written
      expect(__mockPrisma.userAuditLog.create).toHaveBeenCalledTimes(1);
      const auditArg = __mockPrisma.userAuditLog.create.mock.calls[0][0];
      expect(auditArg).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 1001,
            action: 'create',
            entityType: 'user',
            entityId: 1001,
            ipAddress: '10.0.0.1',
            userAgent: 'svc-test-agent',
            success: true,
          }),
        })
      );

      // Response should exclude passwordHash and any sensitive data
      expect(result).toEqual(
        expect.objectContaining({
          id: 1001,
          username: validUserData.username,
          email: validUserData.email,
          fullName: validUserData.fullName,
          role: UserRole.accountant,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          avatarType: 'generated',
        })
      );
      // Sensitive field should not be present
      // @ts-expect-error verifying exclusion
      expect(result.passwordHash).toBeUndefined();
    });
  });

  describe('createUser - uniqueness failure', () => {
    const duplicateUserData = {
      username: 'dupuser',
      email: 'dup@example.com',
      password: 'StrongP@ss1',
      fullName: 'Duplicate User',
    };

    it('throws with clear error when username/email already exist', async () => {
      // Simulate duplicate username, email unique
      __mockPrisma.userAccount.findFirst
        .mockResolvedValueOnce({ id: 9 }) // username duplicate
        .mockResolvedValueOnce(null); // email unique

      await expect(service.createUser(duplicateUserData as any)).rejects.toThrow(
        /Credential validation failed: Username already exists/
      );

      // Ensure no DB create attempted on uniqueness failure
      expect(__mockPrisma.userAccount.create).not.toHaveBeenCalled();
    });
  });

  describe('checkCredentialUniqueness', () => {
    it('returns isUnique=true when neither username nor email exist', async () => {
      __mockPrisma.userAccount.findFirst
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null); // email check

      const res = await service.checkCredentialUniqueness('newuser', 'new@example.com');

      expect(res).toEqual({
        isUnique: true,
        errors: {},
      });
    });

    it('returns specific errors when username and/or email exist', async () => {
      // username duplicate
      __mockPrisma.userAccount.findFirst
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });

      const res = await service.checkCredentialUniqueness('exists', 'exists@example.com');

      expect(res.isUnique).toBe(false);
      expect(res.errors).toEqual({
        username: 'Username already exists',
        email: 'Email already exists',
      });
    });
  });
});