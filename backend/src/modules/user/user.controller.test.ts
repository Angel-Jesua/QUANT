import { Request, Response } from 'express';
import { UserController } from './user.controller';
import { UserRole } from '@prisma/client';
import { IRegisterUser, IRegistrationResponse } from './user.types';

// Mock the UserService
const mockUserService = {
  createUser: jest.fn(),
  registerUser: jest.fn(),
  getAllUsers: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  authenticateUser: jest.fn(),
  changePassword: jest.fn(),
  checkCredentialUniqueness: jest.fn(),
};

jest.mock('./user.service', () => ({
  UserService: jest.fn().mockImplementation(() => mockUserService),
}));

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    userController = new UserController();
    jest.clearAllMocks();
    
    mockRequest = {
      body: {},
      params: {},
      ip: '127.0.0.1',
      get: jest.fn(),
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('register', () => {
    const validRegistrationData: IRegisterUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      fullName: 'Test User',
      role: UserRole.accountant,
      acceptTerms: true,
    };

    it('should return 201 and user data on successful registration', async () => {
      const expectedResponse: IRegistrationResponse = {
        success: true,
        message: 'User registered successfully',
        user: {
          id: 1,
          username: validRegistrationData.username,
          email: validRegistrationData.email,
          fullName: validRegistrationData.fullName,
          role: UserRole.accountant,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          profileImageUrl: undefined,
          avatarType: 'generated' as any,
          lastLogin: undefined,
        }
      };

      mockRequest.body = validRegistrationData;
      (mockRequest.get as jest.Mock).mockReturnValue('test-agent');
      
      mockUserService.registerUser.mockResolvedValue(expectedResponse);

      await userController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResponse);
      expect(mockUserService.registerUser).toHaveBeenCalledWith(
        validRegistrationData,
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          userId: undefined,
        }
      );
    });

    it('should return 400 for validation errors', async () => {
      const validationErrorResponse: IRegistrationResponse = {
        success: false,
        message: 'Registration failed due to validation errors',
        errors: {
          email: 'Invalid email format',
          password: 'Password is too short',
        }
      };

      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email',
        password: '123',
      };

      mockRequest.body = invalidData;
      (mockRequest.get as jest.Mock).mockReturnValue('test-agent');
      
      mockUserService.registerUser.mockResolvedValue(validationErrorResponse);

      await userController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(validationErrorResponse);
    });

    it('should return 409 for duplicate credentials', async () => {
      const duplicateErrorResponse: IRegistrationResponse = {
        success: false,
        message: 'Registration failed due to duplicate credentials',
        errors: {
          username: 'Username already exists',
        }
      };

      mockRequest.body = validRegistrationData;
      (mockRequest.get as jest.Mock).mockReturnValue('test-agent');
      
      mockUserService.registerUser.mockResolvedValue(duplicateErrorResponse);

      await userController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(duplicateErrorResponse);
    });

    it('should return 500 for server errors', async () => {
      mockRequest.body = validRegistrationData;
      (mockRequest.get as jest.Mock).mockReturnValue('test-agent');
      
      mockUserService.registerUser.mockRejectedValue(new Error('Database error'));

      await userController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to register user',
        errors: {
          general: 'Database error',
        }
      });
    });
  });

  describe('createUser', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: UserRole.accountant,
    };

    it('should return 201 and user data on successful creation', async () => {
      const expectedUser = {
        id: 1,
        username: validUserData.username,
        email: validUserData.email,
        fullName: validUserData.fullName,
        role: UserRole.accountant,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileImageUrl: undefined,
        avatarType: 'generated' as any,
        lastLogin: undefined,
      };

      mockRequest.body = validUserData;
      (mockRequest.get as jest.Mock).mockReturnValue('test-agent');
      
      // Mock the uniqueness check to return success
      mockUserService.checkCredentialUniqueness.mockResolvedValue({
        isUnique: true,
        errors: {}
      });
      
      mockUserService.createUser.mockResolvedValue(expectedUser);

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User created successfully',
        data: expectedUser,
      });
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = {
        ...validUserData,
        email: 'invalid-email',
      };

      mockRequest.body = invalidData;

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Object),
      });
    });

    it('should return 409 for duplicate credentials', async () => {
      mockRequest.body = validUserData;
      (mockRequest.get as jest.Mock).mockReturnValue('test-agent');
      
      mockUserService.checkCredentialUniqueness.mockResolvedValue({
        isUnique: false,
        errors: {
          username: 'Username already exists',
        }
      });

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed - duplicate credentials',
        errors: {
          username: 'Username already exists',
        }
      });
    });
  });

  describe('Request Context Handling', () => {
    it('should extract request context correctly', async () => {
      const validRegistrationData: IRegisterUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        fullName: 'Test User',
        role: UserRole.accountant,
        acceptTerms: true,
      };

      const expectedResponse: IRegistrationResponse = {
        success: true,
        message: 'User registered successfully',
        user: {
          id: 1,
          username: validRegistrationData.username,
          email: validRegistrationData.email,
          fullName: validRegistrationData.fullName,
          role: UserRole.accountant,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          profileImageUrl: undefined,
          avatarType: 'generated' as any,
          lastLogin: undefined,
        }
      };

      mockRequest.body = validRegistrationData;
      (mockRequest as any).ip = '192.168.1.1';
      (mockRequest.get as jest.Mock).mockReturnValue('Mozilla/5.0 (Test Browser)');
      (mockRequest as any).user = { id: 123 };
      
      mockUserService.registerUser.mockResolvedValue(expectedResponse);

      await userController.register(mockRequest as Request, mockResponse as Response);

      expect(mockUserService.registerUser).toHaveBeenCalledWith(
        validRegistrationData,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          userId: 123,
        }
      );
    });
  });
});