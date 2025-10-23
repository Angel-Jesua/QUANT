"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = require("./user.service");
// Mock Prisma Client
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        userAccount: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    })),
}));
describe('UserService - Credential Uniqueness', () => {
    let userService;
    let mockPrisma;
    beforeEach(() => {
        userService = new user_service_1.UserService();
        mockPrisma = userService.prisma;
        jest.clearAllMocks();
    });
    describe('checkCredentialUniqueness', () => {
        it('should return isUnique: true when both username and email are available', async () => {
            // Mock database responses
            mockPrisma.userAccount.findFirst
                .mockResolvedValueOnce(null) // username not found
                .mockResolvedValueOnce(null); // email not found
            const result = await userService.checkCredentialUniqueness('testuser', 'test@example.com');
            expect(result.isUnique).toBe(true);
            expect(result.errors).toEqual({});
        });
        it('should return username error when username already exists', async () => {
            // Mock database responses
            mockPrisma.userAccount.findFirst
                .mockResolvedValueOnce({ id: 1, username: 'testuser' }) // username found
                .mockResolvedValueOnce(null); // email not found
            const result = await userService.checkCredentialUniqueness('testuser', 'test@example.com');
            expect(result.isUnique).toBe(false);
            expect(result.errors.username).toBe('Username already exists');
            expect(result.errors.email).toBeUndefined();
        });
        it('should return email error when email already exists', async () => {
            // Mock database responses
            mockPrisma.userAccount.findFirst
                .mockResolvedValueOnce(null) // username not found
                .mockResolvedValueOnce({ id: 1, email: 'test@example.com' }); // email found
            const result = await userService.checkCredentialUniqueness('testuser', 'test@example.com');
            expect(result.isUnique).toBe(false);
            expect(result.errors.email).toBe('Email already exists');
            expect(result.errors.username).toBeUndefined();
        });
        it('should return both errors when both username and email already exist', async () => {
            // Mock database responses
            mockPrisma.userAccount.findFirst
                .mockResolvedValueOnce({ id: 1, username: 'testuser' }) // username found
                .mockResolvedValueOnce({ id: 2, email: 'test@example.com' }); // email found
            const result = await userService.checkCredentialUniqueness('testuser', 'test@example.com');
            expect(result.isUnique).toBe(false);
            expect(result.errors.username).toBe('Username already exists');
            expect(result.errors.email).toBe('Email already exists');
        });
        it('should exclude user from check when excludeUserId is provided', async () => {
            // Mock database responses
            mockPrisma.userAccount.findFirst
                .mockResolvedValueOnce({ id: 1, username: 'testuser' }) // same user
                .mockResolvedValueOnce(null); // email not found
            const result = await userService.checkCredentialUniqueness('testuser', 'test@example.com', 1);
            expect(result.isUnique).toBe(true);
            expect(result.errors).toEqual({});
        });
        it('should only check username when email is not provided', async () => {
            // Mock database response
            mockPrisma.userAccount.findFirst
                .mockResolvedValueOnce(null); // username not found
            const result = await userService.checkCredentialUniqueness('testuser');
            expect(result.isUnique).toBe(true);
            expect(result.errors).toEqual({});
            expect(mockPrisma.userAccount.findFirst).toHaveBeenCalledTimes(1);
        });
        it('should only check email when username is not provided', async () => {
            // Mock database response
            mockPrisma.userAccount.findFirst
                .mockResolvedValueOnce(null); // email not found
            const result = await userService.checkCredentialUniqueness(undefined, 'test@example.com');
            expect(result.isUnique).toBe(true);
            expect(result.errors).toEqual({});
            expect(mockPrisma.userAccount.findFirst).toHaveBeenCalledTimes(1);
        });
    });
});
