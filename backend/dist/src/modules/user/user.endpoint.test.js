"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("@prisma/client");
// Prepare a shared mock service that the controller will use
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
// Mock UserService before importing routes so controllers bind to this mock
jest.mock('./user.service', () => ({
    UserService: jest.fn().mockImplementation(() => mockUserService),
}));
// Bypass JWT auth for protected /api/users routes during endpoint tests
jest.mock('../../middleware/auth.middleware', () => ({
    authenticateJWT: (req, _res, next) => {
        req.userId = 1;
        req.user = { id: 1, email: 'endpoint@test', username: 'endpoint', role: 'accountant' };
        next();
    },
}));
const user_routes_1 = require("./user.routes");
function buildTestApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api/users', user_routes_1.userRoutes);
    return app;
}
describe('User Endpoints - POST integration via router', () => {
    let app;
    beforeEach(() => {
        jest.clearAllMocks();
        app = buildTestApp();
    });
    describe('POST /api/users - Create User', () => {
        const validUserData = {
            username: 'endpointuser',
            email: 'endpoint@example.com',
            password: 'password123',
            fullName: 'Endpoint User',
            role: client_1.UserRole.accountant,
        };
        it('returns 201 with success payload for valid data and excludes sensitive fields', async () => {
            const expectedUser = {
                id: 101,
                username: validUserData.username,
                email: validUserData.email,
                fullName: validUserData.fullName,
                role: client_1.UserRole.accountant,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                profileImageUrl: undefined,
                avatarType: 'generated',
                lastLogin: undefined,
            };
            mockUserService.checkCredentialUniqueness.mockResolvedValue({
                isUnique: true,
                errors: {},
            });
            mockUserService.createUser.mockResolvedValue(expectedUser);
            const res = await (0, supertest_1.default)(app)
                .post('/api/users')
                .set('User-Agent', 'endpoint-test-agent')
                .send(validUserData)
                .expect(201);
            expect(res.body).toEqual({
                success: true,
                message: 'User created successfully',
                data: expect.objectContaining({
                    id: expect.any(Number),
                    username: validUserData.username,
                    email: validUserData.email,
                    fullName: validUserData.fullName,
                    role: 'accountant',
                    isActive: true,
                    avatarType: 'generated',
                }),
            });
            // Sensitive field exclusion
            expect(res.body.data.passwordHash).toBeUndefined();
            // Verify service interactions
            expect(mockUserService.checkCredentialUniqueness).toHaveBeenCalledWith(validUserData.username, validUserData.email);
            expect(mockUserService.createUser).toHaveBeenCalledTimes(1);
            expect(mockUserService.createUser).toHaveBeenCalledWith(validUserData, expect.objectContaining({
                ipAddress: expect.any(String),
                userAgent: 'endpoint-test-agent',
                userId: expect.any(Number),
            }));
        });
        it('returns 400 with validation errors for invalid payload', async () => {
            const invalidData = {
                ...validUserData,
                email: 'invalid-email',
            };
            const res = await (0, supertest_1.default)(app)
                .post('/api/users')
                .send(invalidData)
                .expect(400);
            expect(res.body).toEqual({
                success: false,
                message: 'Validation failed',
                errors: expect.any(Object),
            });
            // Uniqueness check should not be called if basic validation fails
            expect(mockUserService.checkCredentialUniqueness).not.toHaveBeenCalled();
            expect(mockUserService.createUser).not.toHaveBeenCalled();
        });
        it('returns 409 when uniqueness check fails', async () => {
            mockUserService.checkCredentialUniqueness.mockResolvedValue({
                isUnique: false,
                errors: { username: 'Username already exists' },
            });
            const res = await (0, supertest_1.default)(app)
                .post('/api/users')
                .send(validUserData)
                .expect(409);
            expect(res.body).toEqual({
                success: false,
                message: 'Validation failed - duplicate credentials',
                errors: { username: 'Username already exists' },
            });
            // createUser should not be called on uniqueness failure
            expect(mockUserService.createUser).not.toHaveBeenCalled();
        });
        it('returns 500 when the service throws during creation', async () => {
            mockUserService.checkCredentialUniqueness.mockResolvedValue({
                isUnique: true,
                errors: {},
            });
            mockUserService.createUser.mockRejectedValue(new Error('Database error'));
            const res = await (0, supertest_1.default)(app)
                .post('/api/users')
                .send(validUserData)
                .expect(500);
            expect(res.body).toEqual({
                success: false,
                message: 'Failed to create user',
                error: 'Database error',
            });
        });
    });
    describe('POST /api/users/register - Register User', () => {
        const validRegistrationData = {
            username: 'regendpointuser',
            email: 'regendpoint@example.com',
            password: 'password123',
            confirmPassword: 'password123',
            fullName: 'Register Endpoint User',
            role: client_1.UserRole.accountant,
            acceptTerms: true,
        };
        it('returns 201 on successful registration and excludes sensitive fields', async () => {
            const expectedUser = {
                id: 201,
                username: validRegistrationData.username,
                email: validRegistrationData.email,
                fullName: validRegistrationData.fullName,
                role: client_1.UserRole.accountant,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                profileImageUrl: undefined,
                avatarType: 'generated',
                lastLogin: undefined,
            };
            mockUserService.registerUser.mockResolvedValue({
                success: true,
                message: 'User registered successfully',
                user: expectedUser,
            });
            const res = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .set('User-Agent', 'register-endpoint-test-agent')
                .send(validRegistrationData)
                .expect(201);
            expect(res.body).toEqual({
                success: true,
                message: 'User registered successfully',
                user: expect.objectContaining({
                    id: expect.any(Number),
                    username: validRegistrationData.username,
                    email: validRegistrationData.email,
                    fullName: validRegistrationData.fullName,
                    role: 'accountant',
                    isActive: true,
                    avatarType: 'generated',
                }),
            });
            expect(res.body.user.passwordHash).toBeUndefined();
            expect(mockUserService.registerUser).toHaveBeenCalledWith(validRegistrationData, expect.objectContaining({
                ipAddress: expect.any(String),
                userAgent: 'register-endpoint-test-agent',
                userId: undefined,
            }));
        });
        it('returns 400 for validation errors response from service', async () => {
            mockUserService.registerUser.mockResolvedValue({
                success: false,
                message: 'Registration failed due to validation errors',
                errors: {
                    email: 'Invalid email format',
                    password: 'Password is too short',
                },
            });
            const res = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send({ ...validRegistrationData, email: 'invalid-email', password: '123' })
                .expect(400);
            expect(res.body).toEqual({
                success: false,
                message: 'Registration failed due to validation errors',
                errors: expect.objectContaining({
                    email: expect.any(String),
                    password: expect.any(String),
                }),
            });
        });
        it('returns 409 for duplicate credentials response from service', async () => {
            mockUserService.registerUser.mockResolvedValue({
                success: false,
                message: 'Registration failed due to duplicate credentials',
                errors: {
                    username: 'Username already exists',
                },
            });
            const res = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send(validRegistrationData)
                .expect(409);
            expect(res.body).toEqual({
                success: false,
                message: 'Registration failed due to duplicate credentials',
                errors: {
                    username: 'Username already exists',
                },
            });
        });
        it('returns 500 when the service rejects during registration', async () => {
            mockUserService.registerUser.mockRejectedValue(new Error('Database error'));
            const res = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send(validRegistrationData)
                .expect(500);
            expect(res.body).toEqual({
                success: false,
                message: 'Failed to register user',
                errors: {
                    general: 'Database error',
                },
            });
        });
    });
});
