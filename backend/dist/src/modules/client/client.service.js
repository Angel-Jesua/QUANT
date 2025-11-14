"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const DECIMAL_ZERO = new client_1.Prisma.Decimal(0);
function toDecimal(value) {
    if (typeof value === 'string') {
        const v = value.trim();
        if (v.length === 0) {
            throw new Error('CREDIT_LIMIT_REQUIRED');
        }
        return new client_1.Prisma.Decimal(v);
    }
    return new client_1.Prisma.Decimal(value);
}
function requireNonNegative(dec) {
    if (dec.toNumber() < 0) {
        throw new Error('CREDIT_LIMIT_NEGATIVE');
    }
}
/**
 * Normalize creditLimit input into a non-negative Prisma.Decimal.
 * Accepts number, string, undefined, or null. Undefined/null normalize to 0.
 */
function normalizeCreditLimit(value) {
    if (value === undefined || value === null)
        return DECIMAL_ZERO;
    const dec = toDecimal(value);
    requireNonNegative(dec);
    return dec;
}
/**
 * Format Decimal to string for API responses:
 * - return "0" for zero values
 * - otherwise fixed to 2 decimals (e.g., "2500.50")
 */
function formatMoney(dec) {
    const n = dec.toNumber();
    // If integer, return without decimals; otherwise ensure 2 decimal places
    if (Number.isInteger(n))
        return String(n);
    return n.toFixed(2);
}
function mapClient(row) {
    return {
        id: row.id,
        clientCode: row.clientCode,
        taxId: row.taxId ?? undefined,
        name: row.name,
        contactName: row.contactName ?? undefined,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        address: row.address ?? undefined,
        city: row.city ?? undefined,
        state: row.state ?? undefined,
        country: row.country,
        postalCode: row.postalCode ?? undefined,
        creditLimit: formatMoney(row.creditLimit),
        currencyId: row.currencyId,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        createdById: row.createdById,
        updatedById: row.updatedById ?? undefined,
    };
}
class ClientService {
    // ---------- Private helpers ----------
    async ensureUniqueClientCode(code) {
        const existing = await prisma.client.findFirst({
            where: { clientCode: code },
            select: { id: true },
        });
        if (existing)
            throw new Error('DUPLICATE_CLIENT_CODE');
    }
    async ensureCurrencyExists(currencyId) {
        const currency = await prisma.currency.findUnique({
            where: { id: currencyId },
            select: { id: true },
        });
        if (!currency)
            throw new Error('INVALID_CURRENCY');
    }
    buildWhere(filters) {
        const where = {};
        if (!filters)
            return where;
        if (typeof filters.isActive === 'boolean')
            where.isActive = filters.isActive;
        if (typeof filters.countryCode === 'string')
            where.country = filters.countryCode;
        if (typeof filters.stateCode === 'string')
            where.state = filters.stateCode;
        if (typeof filters.currencyId === 'number')
            where.currencyId = filters.currencyId;
        if (typeof filters.search === 'string') {
            const s = filters.search.trim();
            if (s.length > 0) {
                where.OR = [
                    { clientCode: { contains: s, mode: 'insensitive' } },
                    { name: { contains: s, mode: 'insensitive' } },
                    { taxId: { contains: s, mode: 'insensitive' } },
                ];
            }
        }
        return where;
    }
    buildOrder(orderBy, orderDir) {
        const dir = orderDir ?? 'asc';
        const field = orderBy ?? 'clientCode';
        return { [field]: dir };
    }
    // ---------- Public methods ----------
    async getAllClients(filters) {
        const take = typeof filters?.limit === 'number' && filters.limit > 0 ? filters.limit : undefined;
        const skip = typeof filters?.offset === 'number' && filters.offset >= 0 ? filters.offset : undefined;
        const clients = await prisma.client.findMany({
            where: this.buildWhere(filters),
            include: {
                currency: true,
                createdBy: true,
                updatedBy: true,
            },
            orderBy: this.buildOrder(filters?.orderBy, filters?.orderDir),
            take,
            skip,
        });
        return clients.map((row) => {
            const base = {
                id: row.id,
                clientCode: row.clientCode,
                taxId: row.taxId ?? null,
                name: row.name,
                contactName: row.contactName ?? null,
                email: row.email ?? null,
                phone: row.phone ?? null,
                address: row.address ?? null,
                city: row.city ?? null,
                state: row.state ?? null,
                country: row.country,
                postalCode: row.postalCode ?? null,
                creditLimit: row.creditLimit,
                currencyId: row.currencyId,
                isActive: row.isActive,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                createdById: row.createdById,
                updatedById: row.updatedById ?? null,
            };
            return mapClient(base);
        });
    }
    async getClientById(id) {
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                currency: true,
                createdBy: true,
                updatedBy: true,
            },
        });
        if (!client)
            return null;
        const base = {
            id: client.id,
            clientCode: client.clientCode,
            taxId: client.taxId ?? null,
            name: client.name,
            contactName: client.contactName ?? null,
            email: client.email ?? null,
            phone: client.phone ?? null,
            address: client.address ?? null,
            city: client.city ?? null,
            state: client.state ?? null,
            country: client.country,
            postalCode: client.postalCode ?? null,
            creditLimit: client.creditLimit,
            currencyId: client.currencyId,
            isActive: client.isActive,
            createdAt: client.createdAt,
            updatedAt: client.updatedAt,
            createdById: client.createdById,
            updatedById: client.updatedById ?? null,
        };
        return mapClient(base);
    }
    async createClient(data, ctxOrUser) {
        const userId = typeof ctxOrUser === 'number' ? ctxOrUser : ctxOrUser?.userId;
        if (!userId) {
            throw new Error('AUTH_REQUIRED');
        }
        // Normalize requireds
        const clientCode = (data.clientCode ?? '').trim().toUpperCase();
        const name = (data.name ?? '').trim();
        const currencyId = Number(data.currencyId);
        if (!clientCode || clientCode.length > 20)
            throw new Error('CLIENT_CODE_INVALID');
        if (!name)
            throw new Error('NAME_REQUIRED');
        if (!Number.isInteger(currencyId) || currencyId <= 0)
            throw new Error('INVALID_CURRENCY');
        // Normalize optionals
        const taxId = typeof data.taxId === 'string' && data.taxId.trim().length > 0
            ? data.taxId.trim().toUpperCase()
            : null;
        const contactName = typeof data.contactName === 'string' && data.contactName.trim().length > 0
            ? data.contactName.trim()
            : null;
        const email = typeof data.email === 'string' && data.email.trim().length > 0
            ? data.email.trim().toLowerCase()
            : null;
        const phone = typeof data.phone === 'string' && data.phone.trim().length > 0
            ? data.phone.trim()
            : null;
        const address = typeof data.address === 'string' && data.address.trim().length > 0
            ? data.address.trim()
            : null;
        const city = typeof data.city === 'string' && data.city.trim().length > 0
            ? data.city.trim()
            : null;
        const state = typeof data.state === 'string' && data.state.trim().length > 0
            ? data.state.trim()
            : null;
        const country = typeof data.country === 'string' && data.country.trim().length > 0
            ? data.country.trim()
            : 'Nicaragua';
        const postalCode = typeof data.postalCode === 'string' && data.postalCode.trim().length > 0
            ? data.postalCode.trim()
            : null;
        const creditLimitDecimal = normalizeCreditLimit(data.creditLimit);
        const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
        await this.ensureCurrencyExists(currencyId);
        await this.ensureUniqueClientCode(clientCode);
        // Additional explicit pre-check to strengthen duplicate detection in mocked/prisma environments
        const dupCode = await prisma.client.findFirst({
            where: { clientCode },
            select: { id: true },
        });
        if (dupCode) {
            throw new Error('DUPLICATE_CLIENT_CODE');
        }
        if (taxId) {
            const existingTaxId = await prisma.client.findFirst({
                where: { taxId },
                select: { id: true },
            });
            if (existingTaxId) {
                throw new Error('DUPLICATE_TAX_ID');
            }
        }
        try {
            const created = await prisma.client.create({
                data: {
                    clientCode,
                    taxId,
                    name,
                    contactName,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    country,
                    postalCode,
                    creditLimit: creditLimitDecimal,
                    currencyId,
                    isActive,
                    createdById: userId,
                },
                include: {
                    currency: true,
                    createdBy: true,
                    updatedBy: true,
                },
            });
            // Audit success
            await prisma.userAuditLog.create({
                data: {
                    userId,
                    action: client_1.AuditAction.create,
                    entityType: 'client',
                    entityId: created.id,
                    newData: {
                        id: created.id,
                        clientCode: created.clientCode,
                        taxId: created.taxId ?? undefined,
                        name: created.name,
                        email: created.email ?? undefined,
                        currencyId: created.currencyId,
                        creditLimit: formatMoney(created.creditLimit),
                        isActive: created.isActive,
                    },
                    ipAddress: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.ipAddress,
                    userAgent: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.userAgent,
                    success: true,
                    performedAt: new Date(),
                },
            });
            const base = {
                id: created.id,
                clientCode: created.clientCode,
                taxId: created.taxId ?? null,
                name: created.name,
                contactName: created.contactName ?? null,
                email: created.email ?? null,
                phone: created.phone ?? null,
                address: created.address ?? null,
                city: created.city ?? null,
                state: created.state ?? null,
                country: created.country,
                postalCode: created.postalCode ?? null,
                creditLimit: created.creditLimit,
                currencyId: created.currencyId,
                isActive: created.isActive,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
                createdById: created.createdById,
                updatedById: created.updatedById ?? null,
            };
            return mapClient(base);
        }
        catch (error) {
            const err = error;
            if (err?.code === 'P2002') {
                const target = Array.isArray(err?.meta?.target) ? err.meta.target : [];
                if (target.includes('client_code') || target.includes('Client_clientCode_key')) {
                    throw new Error('DUPLICATE_CLIENT_CODE');
                }
                if (target.includes('tax_id') || target.includes('Client_taxId_key')) {
                    throw new Error('DUPLICATE_TAX_ID');
                }
            }
            // Audit failure
            try {
                await prisma.userAuditLog.create({
                    data: {
                        userId,
                        action: client_1.AuditAction.create,
                        entityType: 'client',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        ipAddress: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.ipAddress,
                        userAgent: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.userAgent,
                        success: false,
                        performedAt: new Date(),
                    },
                });
            }
            catch {
                // ignore
            }
            throw error;
        }
    }
    async updateClient(id, data, ctxOrUser) {
        const userId = typeof ctxOrUser === 'number' ? ctxOrUser : ctxOrUser?.userId;
        // Load current state
        const current = await prisma.client.findUnique({
            where: { id },
            include: {
                currency: true,
                createdBy: true,
                updatedBy: true,
            },
        });
        if (!current) {
            return null;
        }
        // Disallow changing clientCode
        if (typeof data.clientCode === 'string') {
            const requested = data.clientCode.trim().toUpperCase();
            if (requested !== current.clientCode) {
                throw new Error('INVALID_OPERATION');
            }
        }
        // Build update payload strictly
        const updateData = {};
        if (typeof data.taxId === 'string') {
            const v = data.taxId.trim().toUpperCase();
            updateData.taxId = v.length > 0 ? v : null;
        }
        else if (data.taxId === null) {
            updateData.taxId = null;
        }
        if (typeof data.name === 'string') {
            const v = data.name.trim();
            if (!v)
                throw new Error('NAME_REQUIRED');
            updateData.name = v;
        }
        if (typeof data.contactName === 'string') {
            const v = data.contactName.trim();
            updateData.contactName = v.length > 0 ? v : null;
        }
        else if (data.contactName === null) {
            updateData.contactName = null;
        }
        if (typeof data.email === 'string') {
            const v = data.email.trim().toLowerCase();
            updateData.email = v.length > 0 ? v : null;
        }
        else if (data.email === null) {
            updateData.email = null;
        }
        if (typeof data.phone === 'string') {
            const v = data.phone.trim();
            updateData.phone = v.length > 0 ? v : null;
        }
        else if (data.phone === null) {
            updateData.phone = null;
        }
        if (typeof data.address === 'string') {
            const v = data.address.trim();
            updateData.address = v.length > 0 ? v : null;
        }
        else if (data.address === null) {
            updateData.address = null;
        }
        if (typeof data.city === 'string') {
            const v = data.city.trim();
            updateData.city = v.length > 0 ? v : null;
        }
        else if (data.city === null) {
            updateData.city = null;
        }
        if (typeof data.state === 'string') {
            const v = data.state.trim();
            updateData.state = v.length > 0 ? v : null;
        }
        else if (data.state === null) {
            updateData.state = null;
        }
        if (typeof data.country === 'string') {
            updateData.country = data.country.trim();
        }
        if (typeof data.postalCode === 'string') {
            const v = data.postalCode.trim();
            updateData.postalCode = v.length > 0 ? v : null;
        }
        else if (data.postalCode === null) {
            updateData.postalCode = null;
        }
        if (typeof data.isActive === 'boolean') {
            updateData.isActive = data.isActive;
        }
        if (data.creditLimit !== undefined && data.creditLimit !== null) {
            updateData.creditLimit = normalizeCreditLimit(data.creditLimit);
        }
        if (typeof data.currencyId === 'number') {
            if (!Number.isInteger(data.currencyId) || data.currencyId <= 0) {
                throw new Error('INVALID_CURRENCY');
            }
            await this.ensureCurrencyExists(data.currencyId);
            updateData.currencyId = data.currencyId;
        }
        if (userId) {
            updateData.updatedById = userId;
        }
        try {
            const updated = await prisma.client.update({
                where: { id },
                data: updateData,
                include: {
                    currency: true,
                    createdBy: true,
                    updatedBy: true,
                },
            });
            // Audit success
            await prisma.userAuditLog.create({
                data: {
                    userId,
                    action: client_1.AuditAction.update,
                    entityType: 'client',
                    entityId: updated.id,
                    newData: {
                        id: updated.id,
                        clientCode: updated.clientCode,
                        taxId: updated.taxId ?? undefined,
                        name: updated.name,
                        email: updated.email ?? undefined,
                        currencyId: updated.currencyId,
                        creditLimit: formatMoney(updated.creditLimit),
                        isActive: updated.isActive,
                    },
                    ipAddress: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.ipAddress,
                    userAgent: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.userAgent,
                    success: true,
                    performedAt: new Date(),
                },
            });
            const base = {
                id: updated.id,
                clientCode: updated.clientCode,
                taxId: updated.taxId ?? null,
                name: updated.name,
                contactName: updated.contactName ?? null,
                email: updated.email ?? null,
                phone: updated.phone ?? null,
                address: updated.address ?? null,
                city: updated.city ?? null,
                state: updated.state ?? null,
                country: updated.country,
                postalCode: updated.postalCode ?? null,
                creditLimit: updated.creditLimit,
                currencyId: updated.currencyId,
                isActive: updated.isActive,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
                createdById: updated.createdById,
                updatedById: updated.updatedById ?? null,
            };
            return mapClient(base);
        }
        catch (error) {
            const err = error;
            if (err?.code === 'P2002') {
                const target = Array.isArray(err?.meta?.target) ? err.meta.target : [];
                if (target.includes('client_code') || target.includes('Client_clientCode_key')) {
                    throw new Error('DUPLICATE_CLIENT_CODE');
                }
                if (target.includes('tax_id') || target.includes('Client_taxId_key')) {
                    throw new Error('DUPLICATE_TAX_ID');
                }
            }
            if (err?.code === 'P2025') {
                return null;
            }
            try {
                await prisma.userAuditLog.create({
                    data: {
                        userId,
                        action: client_1.AuditAction.update,
                        entityType: 'client',
                        entityId: id,
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        ipAddress: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.ipAddress,
                        userAgent: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.userAgent,
                        success: false,
                        performedAt: new Date(),
                    },
                });
            }
            catch {
                // ignore
            }
            throw error;
        }
    }
    async deleteClient(id, ctxOrUser) {
        const userId = typeof ctxOrUser === 'number' ? ctxOrUser : ctxOrUser?.userId;
        try {
            const exists = await prisma.client.findUnique({
                where: { id },
                select: { id: true, isActive: true },
            });
            if (!exists) {
                return false;
            }
            // Soft delete: mark inactive and set updatedById if available (use UncheckedUpdate to set FK scalar)
            const deleteData = {
                isActive: false,
                ...(userId ? { updatedById: userId } : {}),
            };
            await prisma.client.update({
                where: { id },
                data: deleteData,
            });
            await prisma.userAuditLog.create({
                data: {
                    userId,
                    action: client_1.AuditAction.delete,
                    entityType: 'client',
                    entityId: id,
                    ipAddress: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.ipAddress,
                    userAgent: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.userAgent,
                    success: true,
                    performedAt: new Date(),
                },
            });
            return true;
        }
        catch (error) {
            const err = error;
            if (err?.code === 'P2025') {
                return false;
            }
            try {
                await prisma.userAuditLog.create({
                    data: {
                        userId,
                        action: client_1.AuditAction.delete,
                        entityType: 'client',
                        entityId: id,
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        ipAddress: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.ipAddress,
                        userAgent: typeof ctxOrUser === 'number' ? undefined : ctxOrUser?.userAgent,
                        success: false,
                        performedAt: new Date(),
                    },
                });
            }
            catch {
                // ignore
            }
            throw error;
        }
    }
}
exports.ClientService = ClientService;
