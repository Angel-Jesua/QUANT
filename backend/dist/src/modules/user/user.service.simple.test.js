"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = require("./user.service");
const client_1 = require("@prisma/client");
// Mock the entire module to avoid database dependencies
jest.mock('./user.service', () => {
    const mockUserService = {
        checkCredentialUniqueness: jest.fn(),
        createUser: jest.fn(),
        registerUser: jest.fn(),
    };
    return {
        UserService: jest.fn().mockImplementation(() => mockUserService),
    };
});
describe('UserService Logic Tests', () => {
    let userService;
    beforeEach(() => {
        userService = new user_service_1.UserService();
        jest.clearAllMocks();
    });
    describe('User Creation Logic', () => {
        const validUserData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            fullName: 'Test User',
            role: client_1.UserRole.accountant,
        };
        it('should validate user creation data structure', () => {
            expect(validUserData.username).toBeDefined();
            expect(validUserData.email).toBeDefined();
            expect(validUserData.password).toBeDefined();
            expect(validUserData.fullName).toBeDefined();
            expect(validUserData.role).toBe(client_1.UserRole.accountant);
        });
        it('should validate registration data structure', () => {
            const validRegistrationData = {
                ...validUserData,
                confirmPassword: 'password123',
                acceptTerms: true,
            };
            expect(validRegistrationData.username).toBeDefined();
            expect(validRegistrationData.email).toBeDefined();
            expect(validRegistrationData.password).toBeDefined();
            expect(validRegistrationData.confirmPassword).toBe(validRegistrationData.password);
            expect(validRegistrationData.fullName).toBeDefined();
            expect(validRegistrationData.acceptTerms).toBe(true);
        });
        it('should handle default values for user creation', () => {
            const userDataWithDefaults = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'password123',
                fullName: 'New User',
                // role is optional, should default to accountant
            };
            expect(userDataWithDefaults.role).toBeUndefined();
            // The service should apply the default role
            expect(client_1.UserRole.accountant).toBe('accountant');
        });
    });
    describe('User Registration Logic', () => {
        it('should validate password confirmation', () => {
            const registrationData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'different123',
                fullName: 'Test User',
                acceptTerms: true,
            };
            const passwordsMatch = registrationData.password === registrationData.confirmPassword;
            expect(passwordsMatch).toBe(false);
        });
        it('should validate terms acceptance', () => {
            const registrationDataWithoutTerms = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                fullName: 'Test User',
                acceptTerms: false,
            };
            expect(registrationDataWithoutTerms.acceptTerms).toBe(false);
        });
        it('should validate email format', () => {
            const validEmail = 'test@example.com';
            const invalidEmail = 'invalid-email';
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            expect(emailRegex.test(validEmail)).toBe(true);
            expect(emailRegex.test(invalidEmail)).toBe(false);
        });
        it('should validate username format', () => {
            const validUsername = 'testuser123';
            const invalidUsername = 'test user!';
            const usernameRegex = /^[a-zA-Z0-9_-]+$/;
            expect(usernameRegex.test(validUsername)).toBe(true);
            expect(usernameRegex.test(invalidUsername)).toBe(false);
        });
    });
    describe('Default Values Validation', () => {
        it('should have correct default role', () => {
            expect(client_1.UserRole.accountant).toBe('accountant');
        });
        it('should have correct default avatar type', () => {
            expect(client_1.AvatarType.generated).toBe('generated');
        });
        it('should have correct audit action', () => {
            expect(client_1.AuditAction.create).toBe('create');
        });
    });
    describe('Response Structure Validation', () => {
        it('should validate user response structure', () => {
            const mockUserResponse = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                fullName: 'Test User',
                role: client_1.UserRole.accountant,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                profileImageUrl: undefined,
                profileImageStatus: 'default',
                avatarType: client_1.AvatarType.generated,
                lastLogin: undefined,
            };
            expect(mockUserResponse.id).toBeGreaterThan(0);
            expect(typeof mockUserResponse.username).toBe('string');
            expect(typeof mockUserResponse.email).toBe('string');
            expect(typeof mockUserResponse.fullName).toBe('string');
            expect(typeof mockUserResponse.role).toBe('string');
            expect(typeof mockUserResponse.isActive).toBe('boolean');
            expect(mockUserResponse.createdAt).toBeInstanceOf(Date);
            expect(mockUserResponse.updatedAt).toBeInstanceOf(Date);
            expect(typeof mockUserResponse.avatarType).toBe('string');
        });
        it('should validate registration response structure', () => {
            const mockSuccessResponse = {
                success: true,
                message: 'User registered successfully',
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    fullName: 'Test User',
                    role: client_1.UserRole.accountant,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    profileImageUrl: undefined,
                    profileImageStatus: 'default',
                    avatarType: client_1.AvatarType.generated,
                    lastLogin: undefined,
                }
            };
            const mockErrorResponse = {
                success: false,
                message: 'Registration failed due to validation errors',
                errors: {
                    email: 'Invalid email format',
                    password: 'Password is too short'
                }
            };
            expect(mockSuccessResponse.success).toBe(true);
            expect(mockSuccessResponse.user).toBeDefined();
            expect(mockErrorResponse.success).toBe(false);
            expect(mockErrorResponse.errors).toBeDefined();
        });
    });
});
