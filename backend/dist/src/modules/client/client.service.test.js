"use strict";
/**
 * ClientService unit/integration-style tests using Jest module mocks for PrismaClient.
 * Covers:
 * - Valid creation flow with Decimal mapping and includes
 * - Duplicate clientCode conflict
 * - Non-existent currency validation
 * - Get by id with includes and creditLimit string mapping
 * - List with typed filters, pagination, and ordering
 * - Update disallowing clientCode change and valid field updates
 * - Soft delete (mark inactive) success and not-found
 *
 * Note: Journal entry/accounting movement tables are not present in schema; deletion checks for
 * movements cannot be implemented yet. A future test should assert BusinessRuleError when those tables exist.
 */
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('@prisma/client', () => {
    // Minimal Decimal implementation compatible with service usage
    class MockDecimal {
        constructor(v) {
            if (v instanceof MockDecimal) {
                this.val = v.val;
            }
            else if (typeof v === 'number') {
                this.val = v;
            }
            else {
                const n = Number(String(v));
                this.val = Number.isFinite(n) ? n : 0;
            }
        }
        toString() {
            // Keep string representation stable; emulate Prisma.Decimal default
            return String(this.val);
        }
        toNumber() {
            return this.val;
        }
        equals(other) {
            const o = other instanceof MockDecimal ? other.val : Number(String(other));
            return this.val === o;
        }
    }
    const client = {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    };
    const currency = {
        findUnique: jest.fn(),
    };
    const userAuditLog = {
        create: jest.fn(),
    };
    class PrismaClient {
        constructor() {
            this.client = client;
            this.currency = currency;
            this.userAuditLog = userAuditLog;
        }
    }
    const __mockPrisma = { client, currency, userAuditLog };
    return {
        PrismaClient,
        Prisma: { Decimal: MockDecimal },
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
const client_service_1 = require("./client.service");
const { __mockPrisma } = require('@prisma/client');
describe('ClientService - Prisma-mocked tests', () => {
    let service;
    beforeEach(() => {
        service = new client_service_1.ClientService();
        jest.clearAllMocks();
    });
    describe('createClient', () => {
        const baseCreate = {
            clientCode: 'CLI-001',
            name: 'Acme Corp',
            currencyId: 1,
            creditLimit: '2500.50',
            email: 'billing@acme.com',
        };
        it('creates a client with valid data, maps Decimal to string, includes relations', async () => {
            // Ensure currency exists
            __mockPrisma.currency.findUnique.mockResolvedValue({ id: 1 });
            // Pre-uniqueness checks
            __mockPrisma.client.findFirst
                .mockResolvedValueOnce(null) // clientCode uniqueness
                .mockResolvedValueOnce(null); // taxId uniqueness
            // Mock prisma create returning included entity
            const now = new Date();
            __mockPrisma.client.create.mockResolvedValue({
                id: 101,
                clientCode: 'CLI-001',
                taxId: null,
                name: 'Acme Corp',
                contactName: null,
                email: 'billing@acme.com',
                phone: null,
                address: null,
                city: null,
                state: null,
                country: 'Nicaragua',
                postalCode: null,
                creditLimit: new (require('@prisma/client').Prisma.Decimal)('2500.50'),
                currencyId: 1,
                isActive: true,
                createdAt: now,
                updatedAt: now,
                createdById: 7,
                updatedById: null,
                currency: { id: 1, code: 'NIO' },
                createdBy: { id: 7 },
                updatedBy: null,
            });
            // Audit success
            __mockPrisma.userAuditLog.create.mockResolvedValue(undefined);
            const result = await service.createClient(baseCreate, 7);
            expect(__mockPrisma.currency.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                select: { id: true },
            });
            expect(__mockPrisma.client.create).toHaveBeenCalledTimes(1);
            // Response mapping
            expect(result).toEqual(expect.objectContaining({
                id: 101,
                clientCode: 'CLI-001',
                name: 'Acme Corp',
                creditLimit: '2500.50',
                currencyId: 1,
                isActive: true,
                createdById: 7,
            }));
        });
        it('throws Conflict when clientCode already exists', async () => {
            __mockPrisma.currency.findUnique.mockResolvedValue({ id: 1 });
            // First findFirst for clientCode returns existing
            __mockPrisma.client.findFirst.mockResolvedValueOnce({ id: 99 });
            await expect(service.createClient(baseCreate, 7)).rejects.toThrow('DUPLICATE_CLIENT_CODE');
            expect(__mockPrisma.client.create).not.toHaveBeenCalled();
        });
        it('throws ValidationError when currency does not exist', async () => {
            __mockPrisma.currency.findUnique.mockResolvedValue(null);
            await expect(service.createClient(baseCreate, 7)).rejects.toThrow('INVALID_CURRENCY');
        });
    });
    describe('getClientById', () => {
        it('returns mapped client with creditLimit string and includes', async () => {
            const now = new Date();
            __mockPrisma.client.findUnique.mockResolvedValue({
                id: 5,
                clientCode: 'CLI-005',
                taxId: 'RUC-123',
                name: 'Beta LLC',
                contactName: 'Juan',
                email: 'ops@beta.com',
                phone: null,
                address: null,
                city: null,
                state: null,
                country: 'NI',
                postalCode: null,
                creditLimit: new (require('@prisma/client').Prisma.Decimal)('100'),
                currencyId: 2,
                isActive: true,
                createdAt: now,
                updatedAt: now,
                createdById: 1,
                updatedById: null,
                currency: { id: 2 },
                createdBy: { id: 1 },
                updatedBy: null,
            });
            const client = await service.getClientById(5);
            expect(__mockPrisma.client.findUnique).toHaveBeenCalledWith({
                where: { id: 5 },
                include: { currency: true, createdBy: true, updatedBy: true },
            });
            expect(client?.creditLimit).toBe('100');
            expect(client?.clientCode).toBe('CLI-005');
        });
        it('returns null when not found', async () => {
            __mockPrisma.client.findUnique.mockResolvedValue(null);
            const client = await service.getClientById(999);
            expect(client).toBeNull();
        });
    });
    describe('getAllClients with filters', () => {
        it('applies where, order, take and skip based on filters', async () => {
            const filters = {
                isActive: true,
                countryCode: 'NI',
                stateCode: 'MN',
                currencyId: 1,
                search: 'ac',
                orderBy: 'clientCode',
                orderDir: 'desc',
                limit: 2,
                offset: 5,
            };
            const now = new Date();
            __mockPrisma.client.findMany.mockResolvedValue([
                {
                    id: 1,
                    clientCode: 'AC-001',
                    taxId: null,
                    name: 'Acme',
                    contactName: null,
                    email: null,
                    phone: null,
                    address: null,
                    city: null,
                    state: 'MN',
                    country: 'NI',
                    postalCode: null,
                    creditLimit: new (require('@prisma/client').Prisma.Decimal)('0'),
                    currencyId: 1,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                    createdById: 10,
                    updatedById: null,
                    currency: { id: 1 },
                    createdBy: { id: 10 },
                    updatedBy: null,
                },
            ]);
            const list = await service.getAllClients(filters);
            // Verify call args to Prisma
            const call = __mockPrisma.client.findMany.mock.calls[0][0];
            expect(call.where).toEqual(expect.objectContaining({
                isActive: true,
                country: 'NI',
                state: 'MN',
                currencyId: 1,
                OR: expect.arrayContaining([
                    expect.objectContaining({ clientCode: expect.any(Object) }),
                    expect.objectContaining({ name: expect.any(Object) }),
                    expect.objectContaining({ taxId: expect.any(Object) }),
                ]),
            }));
            expect(call.orderBy).toEqual({ clientCode: 'desc' });
            expect(call.take).toBe(2);
            expect(call.skip).toBe(5);
            expect(list.length).toBe(1);
            expect(list[0].creditLimit).toBe('0');
            expect(list[0].clientCode).toBe('AC-001');
        });
        it('defaults order by clientCode asc and no pagination when filters not provided', async () => {
            __mockPrisma.client.findMany.mockResolvedValue([]);
            await service.getAllClients(undefined);
            const call = __mockPrisma.client.findMany.mock.calls[0][0];
            expect(call.orderBy).toEqual({ clientCode: 'asc' });
            expect(call.take).toBeUndefined();
            expect(call.skip).toBeUndefined();
        });
    });
    describe('updateClient', () => {
        const now = new Date();
        it('updates allowed fields, converts creditLimit, validates currency existence', async () => {
            __mockPrisma.client.findUnique.mockResolvedValue({
                id: 200,
                clientCode: 'CLI-200',
                taxId: null,
                name: 'Orig',
                contactName: null,
                email: null,
                phone: null,
                address: null,
                city: null,
                state: null,
                country: 'NI',
                postalCode: null,
                creditLimit: new (require('@prisma/client').Prisma.Decimal)('10'),
                currencyId: 1,
                isActive: true,
                createdAt: now,
                updatedAt: now,
                createdById: 3,
                updatedById: null,
                currency: { id: 1 },
                createdBy: { id: 3 },
                updatedBy: null,
            });
            __mockPrisma.currency.findUnique.mockResolvedValue({ id: 2 });
            __mockPrisma.client.update.mockResolvedValue({
                id: 200,
                clientCode: 'CLI-200',
                taxId: 'NEW',
                name: 'New Name',
                contactName: 'Mario',
                email: 'mario@example.com',
                phone: '+50588887777',
                address: 'Addr',
                city: 'City',
                state: 'ST',
                country: 'NI',
                postalCode: '11001',
                creditLimit: new (require('@prisma/client').Prisma.Decimal)('0'),
                currencyId: 2,
                isActive: true,
                createdAt: now,
                updatedAt: now,
                createdById: 3,
                updatedById: 7,
                currency: { id: 2 },
                createdBy: { id: 3 },
                updatedBy: { id: 7 },
            });
            const result = await service.updateClient(200, {
                taxId: 'new',
                name: 'New Name',
                contactName: 'Mario',
                email: 'mario@example.com',
                phone: '+50588887777',
                address: 'Addr',
                city: 'City',
                state: 'ST',
                postalCode: '11001',
                creditLimit: '0',
                currencyId: 2,
            }, 7);
            expect(result?.creditLimit).toBe('0');
            expect(result?.currencyId).toBe(2);
            // Ensure currency existence checked
            expect(__mockPrisma.currency.findUnique).toHaveBeenCalledWith({
                where: { id: 2 },
                select: { id: true },
            });
        });
        it('throws when attempting to change clientCode', async () => {
            __mockPrisma.client.findUnique.mockResolvedValue({
                id: 201,
                clientCode: 'CLI-201',
            });
            await expect(service.updateClient(201, { clientCode: 'DIFF' }, 9)).rejects.toThrow('INVALID_OPERATION');
        });
        it('returns null when client not found', async () => {
            __mockPrisma.client.findUnique.mockResolvedValue(null);
            const res = await service.updateClient(999, { name: 'X' }, 1);
            expect(res).toBeNull();
        });
    });
    describe('deleteClient', () => {
        it('soft-deletes by marking inactive', async () => {
            __mockPrisma.client.findUnique.mockResolvedValue({ id: 50, isActive: true });
            __mockPrisma.client.update.mockResolvedValue({ id: 50 });
            const ok = await service.deleteClient(50, 7);
            expect(ok).toBe(true);
            const call = __mockPrisma.client.update.mock.calls[0][0];
            expect(call.where).toEqual({ id: 50 });
            expect(call.data).toEqual(expect.objectContaining({ isActive: false }));
        });
        it('returns false when client not found', async () => {
            __mockPrisma.client.findUnique.mockResolvedValue(null);
            const ok = await service.deleteClient(404, 7);
            expect(ok).toBe(false);
        });
    });
});
