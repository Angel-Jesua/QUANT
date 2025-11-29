"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const client_1 = require("@prisma/client");
const password_1 = require("../../utils/password");
const encryption_service_1 = require("../../utils/encryption.service");
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
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        address: row.address ?? undefined,
        city: row.city ?? undefined,
        country: row.country,
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
        if (typeof filters.currencyId === 'number')
            where.currencyId = filters.currencyId;
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = filters.startDate;
            if (filters.endDate) {
                // Adjust end date to include the full day
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
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
                email: row.email ?? null,
                phone: row.phone ?? null,
                address: row.address ?? null,
                city: row.city ?? null,
                country: row.country,
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
            email: client.email ?? null,
            phone: client.phone ?? null,
            address: client.address ?? null,
            city: client.city ?? null,
            country: client.country,
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
        const country = typeof data.country === 'string' && data.country.trim().length > 0
            ? data.country.trim()
            : 'Nicaragua';
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
                    email,
                    phone,
                    address,
                    city,
                    country,
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
                email: created.email ?? null,
                phone: created.phone ?? null,
                address: created.address ?? null,
                city: created.city ?? null,
                country: created.country,
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
        if (typeof data.country === 'string') {
            updateData.country = data.country.trim();
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
                email: updated.email ?? null,
                phone: updated.phone ?? null,
                address: updated.address ?? null,
                city: updated.city ?? null,
                country: updated.country,
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
    /**
     * Verify user password and get client details with decrypted email and phone.
     * Works for both administrator and accountant roles.
     */
    async verifyAndGetClientDetails(requestingUserId, password, clientId, requestContext) {
        try {
            // Get the requesting user to verify password
            const requestingUser = await prisma.userAccount.findUnique({
                where: { id: requestingUserId },
                select: { id: true, role: true, passwordHash: true, isActive: true }
            });
            if (!requestingUser || !requestingUser.isActive) {
                return { success: false, message: 'Usuario no encontrado', statusCode: 404 };
            }
            // Verify the user's password
            const isPasswordValid = await (0, password_1.comparePassword)(password, requestingUser.passwordHash);
            if (!isPasswordValid) {
                // Log failed password verification
                await prisma.userAuditLog.create({
                    data: {
                        userId: requestingUserId,
                        action: client_1.AuditAction.failed_login,
                        entityType: 'client',
                        entityId: clientId,
                        ipAddress: requestContext?.ipAddress,
                        userAgent: requestContext?.userAgent,
                        success: false,
                        errorMessage: 'invalid_password_client_view',
                        performedAt: new Date()
                    }
                });
                return { success: false, message: 'Contraseña incorrecta', statusCode: 401 };
            }
            // Get the client details
            const client = await prisma.client.findUnique({
                where: { id: clientId },
                select: { id: true, email: true, phone: true, address: true, createdById: true }
            });
            if (!client) {
                return { success: false, message: 'Cliente no encontrado', statusCode: 404 };
            }
            // Verify ownership - user can only view their own clients
            if (client.createdById !== requestingUserId) {
                return { success: false, message: 'No autorizado para ver este cliente', statusCode: 403 };
            }
            // Decrypt email, phone and address
            let decryptedEmail = client.email;
            let decryptedPhone = client.phone;
            let decryptedAddress = client.address;
            try {
                const encryptionService = (0, encryption_service_1.getEncryptionService)();
                if (client.email && encryptionService.isEncrypted(client.email)) {
                    decryptedEmail = encryptionService.decrypt(client.email, 'email', 'Client');
                }
                if (client.phone && encryptionService.isEncrypted(client.phone)) {
                    decryptedPhone = encryptionService.decrypt(client.phone, 'phone', 'Client');
                }
                if (client.address && encryptionService.isEncrypted(client.address)) {
                    decryptedAddress = encryptionService.decrypt(client.address, 'address', 'Client');
                }
            }
            catch (decryptError) {
                console.error('Error decrypting client data:', decryptError);
                // Keep encrypted values if decryption fails
            }
            // Log successful access
            await prisma.userAuditLog.create({
                data: {
                    userId: requestingUserId,
                    action: client_1.AuditAction.login,
                    entityType: 'client',
                    entityId: clientId,
                    ipAddress: requestContext?.ipAddress,
                    userAgent: requestContext?.userAgent,
                    success: true,
                    performedAt: new Date()
                }
            });
            return {
                success: true,
                data: {
                    email: decryptedEmail ?? undefined,
                    phone: decryptedPhone ?? undefined,
                    address: decryptedAddress ?? undefined
                }
            };
        }
        catch (error) {
            console.error('Error in verifyAndGetClientDetails:', error);
            return { success: false, message: 'Error interno del servidor', statusCode: 500 };
        }
    }
}
exports.ClientService = ClientService;
