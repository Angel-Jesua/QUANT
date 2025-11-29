"use strict";
/**
 * Integration tests for Prisma Encryption Middleware
 *
 * Tests encryption/decryption of sensitive fields for:
 * - Client model: email, phone, address, creditLimit
 * - UserAccount model: email, phone, recoveryEmail
 * - JournalEntry model: description, notes
 *
 * Requirements: 3.3, 3.4, 3.5, 3.6
 */
Object.defineProperty(exports, "__esModule", { value: true });
const encryption_middleware_1 = require("./encryption.middleware");
const encryption_service_1 = require("../utils/encryption.service");
const encryption_config_1 = require("../config/encryption.config");
// Test encryption key (64 hex characters = 32 bytes)
const TEST_KEY = 'a'.repeat(64);
describe('Encryption Middleware', () => {
    let encryptionService;
    let middleware;
    beforeAll(() => {
        encryptionService = new encryption_service_1.EncryptionService(TEST_KEY, new encryption_service_1.NoOpCryptoAuditLogger());
        middleware = (0, encryption_middleware_1.createEncryptionMiddleware)(encryption_config_1.ENCRYPTED_FIELDS, encryptionService);
    });
    /**
     * Helper to create mock middleware params
     */
    function createParams(model, action, args = {}) {
        return {
            model,
            action,
            args,
            dataPath: [],
            runInTransaction: false,
        };
    }
    describe('Client model encryption', () => {
        const clientData = {
            email: 'client@example.com',
            phone: '+505 8888-1234',
            address: '123 Main Street, Managua',
            creditLimit: '5000.00',
        };
        it('should encrypt Client fields on create', async () => {
            const params = createParams('Client', 'create', { data: { ...clientData } });
            let capturedArgs = null;
            const next = async (p) => {
                capturedArgs = p.args;
                return { id: 1, ...p.args?.data };
            };
            await middleware(params, next);
            expect(capturedArgs).not.toBeNull();
            const data = capturedArgs.data;
            // Verify fields are encrypted (start with enc: prefix)
            expect(data.email).toMatch(/^enc:/);
            expect(data.phone).toMatch(/^enc:/);
            expect(data.address).toMatch(/^enc:/);
            expect(data.creditLimit).toMatch(/^enc:/);
            // Verify encrypted values are different from original
            expect(data.email).not.toBe(clientData.email);
            expect(data.phone).not.toBe(clientData.phone);
            expect(data.address).not.toBe(clientData.address);
            expect(data.creditLimit).not.toBe(clientData.creditLimit);
        });
        it('should decrypt Client fields on findUnique', async () => {
            // Encrypt the data first
            const encryptedData = {
                id: 1,
                email: encryptionService.encrypt(clientData.email, 'email', 'Client'),
                phone: encryptionService.encrypt(clientData.phone, 'phone', 'Client'),
                address: encryptionService.encrypt(clientData.address, 'address', 'Client'),
                creditLimit: encryptionService.encrypt(clientData.creditLimit, 'creditLimit', 'Client'),
            };
            const params = createParams('Client', 'findUnique', { where: { id: 1 } });
            const next = async () => encryptedData;
            const result = await middleware(params, next);
            // Verify fields are decrypted back to original values
            expect(result.email).toBe(clientData.email);
            expect(result.phone).toBe(clientData.phone);
            expect(result.address).toBe(clientData.address);
            expect(result.creditLimit).toBe(clientData.creditLimit);
        });
        it('should decrypt Client fields on findMany', async () => {
            const encryptedClients = [
                {
                    id: 1,
                    email: encryptionService.encrypt('client1@example.com', 'email', 'Client'),
                    phone: encryptionService.encrypt('+505 1111-1111', 'phone', 'Client'),
                },
                {
                    id: 2,
                    email: encryptionService.encrypt('client2@example.com', 'email', 'Client'),
                    phone: encryptionService.encrypt('+505 2222-2222', 'phone', 'Client'),
                },
            ];
            const params = createParams('Client', 'findMany', {});
            const next = async () => encryptedClients;
            const result = await middleware(params, next);
            expect(result).toHaveLength(2);
            expect(result[0].email).toBe('client1@example.com');
            expect(result[0].phone).toBe('+505 1111-1111');
            expect(result[1].email).toBe('client2@example.com');
            expect(result[1].phone).toBe('+505 2222-2222');
        });
        it('should encrypt Client fields on update', async () => {
            const updateData = { email: 'updated@example.com' };
            const params = createParams('Client', 'update', {
                where: { id: 1 },
                data: updateData,
            });
            let capturedArgs = null;
            const next = async (p) => {
                capturedArgs = p.args;
                return { id: 1, ...p.args?.data };
            };
            await middleware(params, next);
            const data = capturedArgs.data;
            expect(data.email).toMatch(/^enc:/);
            expect(data.email).not.toBe(updateData.email);
        });
        it('should handle null values without encryption', async () => {
            const dataWithNulls = {
                email: null,
                phone: null,
                address: null,
                creditLimit: null,
            };
            const params = createParams('Client', 'create', { data: dataWithNulls });
            let capturedArgs = null;
            const next = async (p) => {
                capturedArgs = p.args;
                return { id: 1, ...p.args?.data };
            };
            await middleware(params, next);
            const data = capturedArgs.data;
            expect(data.email).toBeNull();
            expect(data.phone).toBeNull();
            expect(data.address).toBeNull();
            expect(data.creditLimit).toBeNull();
        });
    });
    describe('UserAccount model encryption', () => {
        const userData = {
            email: 'user@example.com',
            phone: '+505 7777-5555',
            recoveryEmail: 'recovery@example.com',
        };
        it('should encrypt UserAccount fields on create', async () => {
            const params = createParams('UserAccount', 'create', { data: { ...userData } });
            let capturedArgs = null;
            const next = async (p) => {
                capturedArgs = p.args;
                return { id: 1, ...p.args?.data };
            };
            await middleware(params, next);
            const data = capturedArgs.data;
            expect(data.email).toMatch(/^enc:/);
            expect(data.phone).toMatch(/^enc:/);
            expect(data.recoveryEmail).toMatch(/^enc:/);
        });
        it('should decrypt UserAccount fields on findFirst', async () => {
            const encryptedUser = {
                id: 1,
                email: encryptionService.encrypt(userData.email, 'email', 'UserAccount'),
                phone: encryptionService.encrypt(userData.phone, 'phone', 'UserAccount'),
                recoveryEmail: encryptionService.encrypt(userData.recoveryEmail, 'recoveryEmail', 'UserAccount'),
            };
            const params = createParams('UserAccount', 'findFirst', { where: { id: 1 } });
            const next = async () => encryptedUser;
            const result = await middleware(params, next);
            expect(result.email).toBe(userData.email);
            expect(result.phone).toBe(userData.phone);
            expect(result.recoveryEmail).toBe(userData.recoveryEmail);
        });
    });
    describe('JournalEntry model encryption', () => {
        const journalData = {
            description: 'Payment received from client ABC',
            notes: 'Invoice #12345 - Legal services',
        };
        it('should encrypt JournalEntry fields on create', async () => {
            const params = createParams('JournalEntry', 'create', { data: { ...journalData } });
            let capturedArgs = null;
            const next = async (p) => {
                capturedArgs = p.args;
                return { id: 1, ...p.args?.data };
            };
            await middleware(params, next);
            const data = capturedArgs.data;
            expect(data.description).toMatch(/^enc:/);
            // notes field is in the config but may be optional
            if (data.notes) {
                expect(data.notes).toMatch(/^enc:/);
            }
        });
        it('should decrypt JournalEntry fields on findMany', async () => {
            const encryptedEntries = [
                {
                    id: 1,
                    description: encryptionService.encrypt(journalData.description, 'description', 'JournalEntry'),
                    notes: encryptionService.encrypt(journalData.notes, 'notes', 'JournalEntry'),
                },
            ];
            const params = createParams('JournalEntry', 'findMany', {});
            const next = async () => encryptedEntries;
            const result = await middleware(params, next);
            expect(result[0].description).toBe(journalData.description);
            expect(result[0].notes).toBe(journalData.notes);
        });
    });
    describe('Encrypted data in DB is not readable as plaintext', () => {
        it('should produce encrypted values that do not contain original plaintext', async () => {
            const sensitiveEmail = 'sensitive@secret.com';
            const params = createParams('Client', 'create', {
                data: { email: sensitiveEmail },
            });
            let capturedData = null;
            const next = async (p) => {
                capturedData = p.args.data;
                return { id: 1, ...p.args?.data };
            };
            await middleware(params, next);
            // The encrypted value should not contain the original email
            const encryptedEmail = capturedData.email;
            expect(encryptedEmail).not.toContain(sensitiveEmail);
            expect(encryptedEmail).not.toContain('sensitive');
            expect(encryptedEmail).not.toContain('secret');
        });
        it('should not double-encrypt already encrypted values', async () => {
            const originalEmail = 'test@example.com';
            const alreadyEncrypted = encryptionService.encrypt(originalEmail, 'email', 'Client');
            const params = createParams('Client', 'create', {
                data: { email: alreadyEncrypted },
            });
            let capturedData = null;
            const next = async (p) => {
                capturedData = p.args.data;
                return { id: 1, ...p.args?.data };
            };
            await middleware(params, next);
            // Should remain the same (not double-encrypted)
            expect(capturedData.email).toBe(alreadyEncrypted);
        });
    });
    describe('Upsert operations', () => {
        it('should encrypt fields in both create and update parts of upsert', async () => {
            const createData = { email: 'create@example.com' };
            const updateData = { email: 'update@example.com' };
            const params = createParams('Client', 'upsert', {
                where: { id: 1 },
                create: createData,
                update: updateData,
            });
            let capturedArgs = null;
            const next = async (p) => {
                capturedArgs = p.args;
                return { id: 1, email: 'result@example.com' };
            };
            await middleware(params, next);
            expect(capturedArgs.create.email).toMatch(/^enc:/);
            expect(capturedArgs.update.email).toMatch(/^enc:/);
        });
    });
    describe('Non-configured models', () => {
        it('should pass through data unchanged for non-configured models', async () => {
            const currencyData = {
                code: 'USD',
                name: 'US Dollar',
                symbol: '$',
            };
            const params = createParams('Currency', 'create', { data: currencyData });
            let capturedArgs = null;
            const next = async (p) => {
                capturedArgs = p.args;
                return { id: 1, ...p.args?.data };
            };
            await middleware(params, next);
            const data = capturedArgs.data;
            expect(data.code).toBe('USD');
            expect(data.name).toBe('US Dollar');
            expect(data.symbol).toBe('$');
        });
    });
});
