"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Mapping of common parent account names to their codes.
 * Used to resolve "Cuenta Padre" column values from Excel imports.
 */
const PARENT_NAME_TO_CODE_MAP = {
    // Activo
    'activo': '100-000-000',
    'activos': '100-000-000',
    'activo corriente': '110-000-000',
    'activos corrientes': '110-000-000',
    'activo no corriente': '120-000-000',
    'activos no corrientes': '120-000-000',
    'activo fijo': '120-000-000',
    'activos fijos': '120-000-000',
    // Pasivo
    'pasivo': '200-000-000',
    'pasivos': '200-000-000',
    'pasivo corriente': '210-000-000',
    'pasivos corrientes': '210-000-000',
    'pasivo no corriente': '220-000-000',
    'pasivos no corrientes': '220-000-000',
    'pasivo no corriente ': '220-000-000',
    // Capital
    'capital': '300-000-000',
    'patrimonio': '300-000-000',
    'capital social': '310-000-000',
    'utilidades': '320-000-000',
    'utilidades ': '320-000-000',
    // Ingresos
    'ingresos': '400-000-000',
    'ingreso': '400-000-000',
    'ingresos por servicios': '410-000-000',
    'otros ingresos': '420-000-000',
    // Costos
    'costos': '500-000-000',
    'costo': '500-000-000',
    'costos de actividades economicas': '510-000-000',
    // Gastos
    'gastos': '600-000-000',
    'gasto': '600-000-000',
    'gastos generales': '610-000-000',
    'gastos administrativos': '620-000-000',
};
/**
 * Resolve a parent account name to its code.
 * Handles common variations and normalizations.
 */
function resolveParentNameToCode(parentName) {
    if (!parentName)
        return undefined;
    const normalized = parentName.trim().toLowerCase();
    // Direct lookup
    if (PARENT_NAME_TO_CODE_MAP[normalized]) {
        return PARENT_NAME_TO_CODE_MAP[normalized];
    }
    // Try without trailing spaces
    const withoutTrailingSpaces = normalized.replace(/\s+$/, '');
    if (PARENT_NAME_TO_CODE_MAP[withoutTrailingSpaces]) {
        return PARENT_NAME_TO_CODE_MAP[withoutTrailingSpaces];
    }
    // Try partial matches for common patterns
    if (normalized.includes('activo corriente') && !normalized.includes('no corriente')) {
        return '110-000-000';
    }
    if (normalized.includes('activo no corriente') || normalized.includes('activo fijo')) {
        return '120-000-000';
    }
    if (normalized.includes('activo')) {
        return '100-000-000';
    }
    if (normalized.includes('pasivo corriente') && !normalized.includes('no corriente')) {
        return '210-000-000';
    }
    if (normalized.includes('pasivo no corriente')) {
        return '220-000-000';
    }
    if (normalized.includes('pasivo')) {
        return '200-000-000';
    }
    if (normalized.includes('capital') || normalized.includes('patrimonio')) {
        return '300-000-000';
    }
    if (normalized.includes('otros ingresos')) {
        return '420-000-000';
    }
    if (normalized.includes('ingreso')) {
        return '400-000-000';
    }
    if (normalized.includes('costo')) {
        return '500-000-000';
    }
    if (normalized.includes('gasto')) {
        return '600-000-000';
    }
    return undefined;
}
/**
 * Normalize account type string to Prisma AccountType enum.
 * Maps common variations to the correct enum value.
 * Handles all types from the IURIS CONSULTUS chart of accounts.
 */
function normalizeAccountType(typeString) {
    const normalized = typeString.trim().toLowerCase();
    // Direct matches - comprehensive mapping for all Excel types
    const typeMap = {
        // ACTIVO types
        'activo': client_1.AccountType.Activo,
        'activos': client_1.AccountType.Activo,
        'activo corriente': client_1.AccountType.Activo,
        'activos corrientes': client_1.AccountType.Activo,
        'activo no corriente': client_1.AccountType.Activo,
        'activos no corrientes': client_1.AccountType.Activo,
        'activo fijo': client_1.AccountType.Activo,
        'efectivo y equivalente de efectivo': client_1.AccountType.Activo,
        'cuentas por cobrar': client_1.AccountType.Activo,
        'pagos anticipados': client_1.AccountType.Activo,
        'depreciacion acumulada': client_1.AccountType.Activo,
        'propiedad planta y equipo': client_1.AccountType.Activo,
        'mobiliario y equipo de oficina': client_1.AccountType.Activo,
        'suejto a rendicion de cuenta': client_1.AccountType.Activo, // Typo in Excel
        'sujeto a rendicion de cuenta': client_1.AccountType.Activo,
        // PASIVO types
        'pasivo': client_1.AccountType.Pasivo,
        'pasivos': client_1.AccountType.Pasivo,
        'pasivo corriente': client_1.AccountType.Pasivo,
        'pasivos corrientes': client_1.AccountType.Pasivo,
        'pasivo no corriente': client_1.AccountType.Pasivo,
        'pasivo no corriente ': client_1.AccountType.Pasivo, // With trailing space
        'pasivos no corrientes': client_1.AccountType.Pasivo,
        'cuentas por pagar': client_1.AccountType.Pasivo,
        'cuentas por pagar proveedores': client_1.AccountType.Pasivo,
        'cuentas por pagar proveedores ': client_1.AccountType.Pasivo,
        'cuentas por pagar a socios': client_1.AccountType.Pasivo,
        'cuentas por pagar servicios publicos': client_1.AccountType.Pasivo,
        'otras cuentas por pagar': client_1.AccountType.Pasivo,
        'retenciones': client_1.AccountType.Pasivo,
        'retenciones a pagar': client_1.AccountType.Pasivo,
        'impuestos a pagar': client_1.AccountType.Pasivo,
        'provisiones': client_1.AccountType.Pasivo,
        'provisiones ': client_1.AccountType.Pasivo,
        'gastos acumulados por pagar': client_1.AccountType.Pasivo,
        'anticipos clientes': client_1.AccountType.Pasivo,
        'anticipo de gastos': client_1.AccountType.Pasivo,
        'prestamos': client_1.AccountType.Pasivo,
        'prestamos y documentos a pagar largo plazo': client_1.AccountType.Pasivo,
        // CAPITAL types
        'capital': client_1.AccountType.Capital,
        'patrimonio': client_1.AccountType.Capital,
        'capital contable': client_1.AccountType.Capital,
        'capital social': client_1.AccountType.Capital,
        'capital social autorizado': client_1.AccountType.Capital,
        'capital social pagado': client_1.AccountType.Capital,
        'utilidades': client_1.AccountType.Capital,
        'utilidades ': client_1.AccountType.Capital,
        // INGRESOS types
        'ingresos': client_1.AccountType.Ingresos,
        'ingreso': client_1.AccountType.Ingresos,
        'ventas': client_1.AccountType.Ingresos,
        'otros ingresos': client_1.AccountType.Ingresos,
        'ingresos por servicios': client_1.AccountType.Ingresos,
        'ingresos por prestacion de servicios': client_1.AccountType.Ingresos,
        'ingresos por servicios nuevas tecnologias': client_1.AccountType.Ingresos,
        'ingresos por servicios/ administracion-contable': client_1.AccountType.Ingresos,
        'ingresos por servicios/corporativo': client_1.AccountType.Ingresos,
        'ingresos por servicios/litigio': client_1.AccountType.Ingresos,
        'ingresos por servicios/tributario': client_1.AccountType.Ingresos,
        'productos financieros': client_1.AccountType.Ingresos,
        'descuentos': client_1.AccountType.Ingresos,
        'descuentos por servicios': client_1.AccountType.Ingresos,
        'fee': client_1.AccountType.Ingresos,
        // COSTOS types
        'costos': client_1.AccountType.Costos,
        'costo': client_1.AccountType.Costos,
        'costo de venta': client_1.AccountType.Costos,
        'costo de ventas': client_1.AccountType.Costos,
        'costos de actividades economicas': client_1.AccountType.Costos,
        'servicios': client_1.AccountType.Costos,
        // GASTOS types
        'gastos': client_1.AccountType.Gastos,
        'gasto': client_1.AccountType.Gastos,
        'gastos operativos': client_1.AccountType.Gastos,
        'gastos administrativos': client_1.AccountType.Gastos,
        'gastos de operacion': client_1.AccountType.Gastos,
        'gastos generales': client_1.AccountType.Gastos,
        'gastos financieros': client_1.AccountType.Gastos,
        'gastos no deducibles': client_1.AccountType.Gastos,
        'gastos de viajes': client_1.AccountType.Gastos,
        'gastos por servicios legales': client_1.AccountType.Gastos,
        'gastos publicitarios': client_1.AccountType.Gastos,
        'gastos de socios': client_1.AccountType.Gastos,
        'gasto por depreciacion': client_1.AccountType.Gastos,
        'gasto por depreciacion ': client_1.AccountType.Gastos,
        'otros gastos': client_1.AccountType.Gastos,
        'materiales y suministros': client_1.AccountType.Gastos,
        'licencias': client_1.AccountType.Gastos,
        'seguros': client_1.AccountType.Gastos,
        'pagos y beneficios a empleados': client_1.AccountType.Gastos,
        'obligaciones a empleados': client_1.AccountType.Gastos,
        'impuestos de planillas': client_1.AccountType.Gastos,
        'impuestos municipales': client_1.AccountType.Gastos,
        'servicios basicos y otros': client_1.AccountType.Gastos,
        'mantenimiento de instalaciones y equipos': client_1.AccountType.Gastos,
    };
    if (typeMap[normalized]) {
        return typeMap[normalized];
    }
    // Partial match - check if type contains key words (order matters!)
    // Check more specific patterns first
    if (normalized.includes('cuentas por cobrar'))
        return client_1.AccountType.Activo;
    if (normalized.includes('cuentas por pagar'))
        return client_1.AccountType.Pasivo;
    if (normalized.includes('retenciones'))
        return client_1.AccountType.Pasivo;
    if (normalized.includes('impuestos a pagar'))
        return client_1.AccountType.Pasivo;
    if (normalized.includes('provisiones'))
        return client_1.AccountType.Pasivo;
    if (normalized.includes('prestamos'))
        return client_1.AccountType.Pasivo;
    if (normalized.includes('anticipos'))
        return client_1.AccountType.Pasivo;
    if (normalized.includes('activo'))
        return client_1.AccountType.Activo;
    if (normalized.includes('pasivo'))
        return client_1.AccountType.Pasivo;
    if (normalized.includes('capital') || normalized.includes('patrimonio') || normalized.includes('utilidades'))
        return client_1.AccountType.Capital;
    if (normalized.includes('ingreso') || normalized.includes('venta') || normalized.includes('fee'))
        return client_1.AccountType.Ingresos;
    if (normalized.includes('costo'))
        return client_1.AccountType.Costos;
    if (normalized.includes('gasto') || normalized.includes('depreciacion'))
        return client_1.AccountType.Gastos;
    // Default to Activo if no match (or throw error)
    console.warn(`Unknown account type: "${typeString}", defaulting to Activo`);
    return client_1.AccountType.Activo;
}
// CK_nature_by_type business rules (Spanish AccountType mapping)
const PARENT_TYPES = [
    client_1.AccountType.Activo,
    client_1.AccountType.Pasivo,
    client_1.AccountType.Capital,
    client_1.AccountType.Ingresos,
    client_1.AccountType.Gastos,
];
const LEAF_ONLY_TYPES = [
    client_1.AccountType.Costos,
];
const ALLOWED_CHILDREN_BY_PARENT = {
    [client_1.AccountType.Activo]: [client_1.AccountType.Activo],
    [client_1.AccountType.Pasivo]: [client_1.AccountType.Pasivo],
    [client_1.AccountType.Capital]: [client_1.AccountType.Capital],
    [client_1.AccountType.Ingresos]: [client_1.AccountType.Ingresos],
    [client_1.AccountType.Gastos]: [client_1.AccountType.Gastos, client_1.AccountType.Costos],
    [client_1.AccountType.Costos]: [],
};
const ACCOUNT_INCLUDE = {
    parentAccount: true,
    currencyRef: true,
    childAccounts: true,
    createdBy: true,
    updatedBy: true,
};
function mapAccount(row) {
    return {
        id: row.id,
        code: row.code,
        accountNumber: row.accountNumber,
        name: row.name,
        description: row.description ?? undefined,
        type: row.type,
        detailType: row.detailType ?? undefined,
        currencyId: row.currencyId ?? undefined,
        currency: row.currency ?? undefined,
        parentAccountId: row.parentAccountId ?? undefined,
        isDetail: row.isDetail,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        createdById: row.createdById,
        updatedById: row.updatedById ?? undefined,
        currencyRef: row.currencyRef ? {
            id: row.currencyRef.id,
            code: row.currencyRef.code,
            name: row.currencyRef.name,
        } : undefined,
    };
}
async function ensureCurrencyExists(currencyId) {
    const currency = await prisma.currency.findUnique({
        where: { id: currencyId },
        select: { id: true },
    });
    if (!currency)
        throw new Error('INVALID_CURRENCY');
}
async function ensureParentExists(parentId) {
    const parent = await prisma.account.findUnique({
        where: { id: parentId },
        select: { id: true },
    });
    if (!parent)
        throw new Error('INVALID_PARENT');
}
async function ensureUniqueCode(code) {
    const existing = await prisma.account.findFirst({
        where: { code },
        select: { id: true },
    });
    if (existing)
        throw new Error('DUPLICATE_ACCOUNT_NUMBER');
}
function isValidAccountType(value) {
    return typeof value === 'string' && Object.values(client_1.AccountType).includes(value);
}
class AccountService {
    // Centralized structural/type validation equivalent to CK_nature_by_type
    async validateAccountTypeAndStructure(params) {
        const { type, parentAccountId, accountIdToUpdate } = params;
        // Validate allowed type
        const ALL_TYPES = Object.values(client_1.AccountType);
        if (!ALL_TYPES.includes(type)) {
            throw new Error('INVALID_ACCOUNT_TYPE');
        }
        // When a parent is specified, validate existence and compatibility
        if (parentAccountId) {
            const parentRow = await prisma.account.findUnique({
                where: { id: parentAccountId },
                select: { id: true, type: true },
            });
            if (!parentRow) {
                throw new Error('INVALID_PARENT');
            }
            if (!PARENT_TYPES.includes(parentRow.type)) {
                // Only Activo, Pasivo, Capital, Ingresos, Gastos can have children
                throw new Error('INVALID_PARENT');
            }
            const allowedChildren = ALLOWED_CHILDREN_BY_PARENT[parentRow.type] ?? [];
            if (!allowedChildren.includes(type)) {
                // Child type not compatible with parent type
                throw new Error('INVALID_PARENT');
            }
        }
        // Update-specific validations
        if (accountIdToUpdate) {
            const current = await prisma.account.findUnique({
                where: { id: accountIdToUpdate },
                select: { id: true, type: true, parentAccountId: true },
            });
            if (!current) {
                // Caller handles 404; nothing else to validate here
                return;
            }
            // If the account currently has children, prevent changing to a LEAF_ONLY type
            const childrenCount = await prisma.account.count({
                where: { parentAccountId: accountIdToUpdate, isActive: true },
            });
            if (childrenCount > 0 && LEAF_ONLY_TYPES.includes(type)) {
                throw new Error('INVALID_ACCOUNT_TYPE');
            }
            // If type is changing, ensure all existing children remain compatible with the new parent type
            if (type !== current.type) {
                const children = await prisma.account.findMany({
                    where: { parentAccountId: accountIdToUpdate, isActive: true },
                    select: { id: true, type: true },
                });
                const allowedChildrenForNewParent = ALLOWED_CHILDREN_BY_PARENT[type] ?? [];
                for (const child of children) {
                    if (!allowedChildrenForNewParent.includes(child.type)) {
                        throw new Error('INVALID_ACCOUNT_TYPE');
                    }
                }
            }
            // If re-parenting, ensure no cycles are introduced (new parent cannot be a descendant of the account)
            if (parentAccountId !== null && parentAccountId !== current.parentAccountId) {
                let cursor = parentAccountId;
                while (cursor !== null) {
                    if (cursor === accountIdToUpdate) {
                        throw new Error('INVALID_PARENT');
                    }
                    const parentLink = await prisma.account.findUnique({
                        where: { id: cursor },
                        select: { parentAccountId: true },
                    });
                    cursor = parentLink?.parentAccountId ?? null;
                }
            }
            // If keeping the same parent (no reparenting), still ensure compatibility when type changes
            if (current.parentAccountId && parentAccountId === current.parentAccountId) {
                const parentRow2 = await prisma.account.findUnique({
                    where: { id: current.parentAccountId },
                    select: { id: true, type: true },
                });
                if (parentRow2) {
                    const allowedChildren = ALLOWED_CHILDREN_BY_PARENT[parentRow2.type] ?? [];
                    if (!allowedChildren.includes(type)) {
                        throw new Error('INVALID_PARENT');
                    }
                }
            }
        }
    }
    async getAllAccounts(options) {
        const rows = await prisma.account.findMany({
            include: ACCOUNT_INCLUDE,
            orderBy: [{ accountNumber: 'asc' }, { name: 'asc' }],
        });
        const flat = rows.map(mapAccount);
        const structured = options?.structured === true;
        if (!structured) {
            return flat;
        }
        // Build hierarchical tree respecting CK_nature_by_type and avoiding cycles
        const nodeMap = new Map();
        const typeById = new Map();
        const parentById = new Map();
        for (const a of flat) {
            nodeMap.set(a.id, { ...a, children: [] });
            typeById.set(a.id, a.type);
            parentById.set(a.id, a.parentAccountId);
        }
        const roots = [];
        const isCycle = (childId, parentId) => {
            let cursor = parentId;
            const visited = new Set();
            while (typeof cursor === 'number') {
                if (cursor === childId)
                    return true;
                if (visited.has(cursor))
                    return true;
                visited.add(cursor);
                cursor = parentById.get(cursor);
            }
            return false;
        };
        for (const a of flat) {
            const parentId = a.parentAccountId;
            if (typeof parentId === 'number') {
                const parentType = typeById.get(parentId);
                const childType = a.type;
                const allowed = parentType ? (ALLOWED_CHILDREN_BY_PARENT[parentType] ?? []) : [];
                const parentIsLeafOnly = parentType ? LEAF_ONLY_TYPES.includes(parentType) : false;
                if (!parentType || parentIsLeafOnly || !allowed.includes(childType) || isCycle(a.id, parentId)) {
                    roots.push(nodeMap.get(a.id));
                }
                else {
                    const parentNode = nodeMap.get(parentId);
                    if (parentNode) {
                        parentNode.children.push(nodeMap.get(a.id));
                    }
                    else {
                        roots.push(nodeMap.get(a.id));
                    }
                }
            }
            else {
                roots.push(nodeMap.get(a.id));
            }
        }
        // Sort roots and children by accountNumber then name
        const sortNodes = (nodes) => {
            nodes.sort((x, y) => {
                const numCmp = x.accountNumber.localeCompare(y.accountNumber);
                return numCmp !== 0 ? numCmp : x.name.localeCompare(y.name);
            });
            for (const n of nodes)
                sortNodes(n.children);
        };
        sortNodes(roots);
        return roots;
    }
    async getAccountById(id) {
        const row = await prisma.account.findUnique({
            where: { id },
            include: {
                currencyRef: true,
                parentAccount: true,
                childAccounts: true,
                createdBy: true,
                updatedBy: true,
            },
        });
        if (!row)
            return null;
        // Narrow to mapped fields only
        return mapAccount({
            id: row.id,
            code: row.code,
            accountNumber: row.accountNumber,
            name: row.name,
            description: row.description ?? null,
            type: row.type,
            detailType: row.detailType ?? null,
            currencyId: row.currencyId ?? null,
            currency: row.currency ?? null,
            parentAccountId: row.parentAccountId ?? null,
            isDetail: row.isDetail,
            isActive: row.isActive,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            createdById: row.createdById,
            updatedById: row.updatedById ?? null,
            currencyRef: row.currencyRef,
        });
    }
    async createAccount(data, requestContext) {
        if (!requestContext?.userId) {
            throw new Error('AUTH_REQUIRED');
        }
        // Usar code como campo principal, accountNumber como alias
        const code = (data.code ?? '').trim().toUpperCase();
        const accountNumber = data.accountNumber?.trim().toUpperCase() || code;
        const name = (data.name ?? '').trim();
        const type = data.type;
        const detailType = typeof data.detailType === 'string' ? data.detailType.trim() : null;
        // Basic validations
        if (!code || code.length > 11) {
            throw new Error('ACCOUNT_NUMBER_INVALID');
        }
        if (!name) {
            throw new Error('NAME_REQUIRED');
        }
        if (!isValidAccountType(type)) {
            throw new Error('INVALID_ACCOUNT_TYPE');
        }
        const description = typeof data.description === 'string' && data.description.trim().length > 0
            ? data.description.trim()
            : null;
        const parentAccountId = typeof data.parentAccountId === 'number' && Number.isInteger(data.parentAccountId) && data.parentAccountId > 0
            ? data.parentAccountId
            : null;
        const isDetail = typeof data.isDetail === 'boolean' ? data.isDetail : true;
        const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
        if (LEAF_ONLY_TYPES.includes(type) && !isDetail) {
            throw new Error('INVALID_ACCOUNT_TYPE');
        }
        // Currency validation: solo requerido para cuentas de detalle
        let currencyId = null;
        let currency = null;
        if (isDetail) {
            // Para cuentas de detalle, currency es requerido
            if (data.currencyId && Number.isInteger(data.currencyId) && data.currencyId > 0) {
                currencyId = data.currencyId;
                await ensureCurrencyExists(currencyId);
            }
            if (data.currency) {
                currency = data.currency;
            }
        }
        if (parentAccountId !== null) {
            await ensureParentExists(parentAccountId);
        }
        await ensureUniqueCode(code);
        // Structural/type compatibility validation (CK_nature_by_type)
        await this.validateAccountTypeAndStructure({ type, parentAccountId });
        try {
            const created = await prisma.account.create({
                data: {
                    code,
                    accountNumber,
                    name,
                    description,
                    type,
                    detailType,
                    currencyId,
                    currency,
                    parentAccountId,
                    isDetail,
                    isActive,
                    createdById: requestContext.userId,
                },
                include: ACCOUNT_INCLUDE,
            });
            // Audit success
            await prisma.userAuditLog.create({
                data: {
                    userId: requestContext.userId,
                    action: client_1.AuditAction.create,
                    entityType: 'account',
                    entityId: created.id,
                    newData: {
                        id: created.id,
                        code: created.code,
                        accountNumber: created.accountNumber,
                        name: created.name,
                        type: created.type,
                        detailType: created.detailType,
                        currencyId: created.currencyId,
                        currency: created.currency,
                        parentAccountId: created.parentAccountId ?? undefined,
                        isDetail: created.isDetail,
                        isActive: created.isActive,
                    },
                    ipAddress: requestContext.ipAddress,
                    userAgent: requestContext.userAgent,
                    success: true,
                    performedAt: new Date(),
                },
            });
            return mapAccount(created);
        }
        catch (error) {
            // Map Prisma unique constraint error
            if (error?.code === 'P2002') {
                throw new Error('DUPLICATE_ACCOUNT_NUMBER');
            }
            // Audit failure
            try {
                await prisma.userAuditLog.create({
                    data: {
                        userId: requestContext.userId,
                        action: client_1.AuditAction.create,
                        entityType: 'account',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        ipAddress: requestContext.ipAddress,
                        userAgent: requestContext.userAgent,
                        success: false,
                        performedAt: new Date(),
                    },
                });
            }
            catch {
                // ignore audit error
            }
            throw error;
        }
    }
    async updateAccount(id, data, requestContext) {
        // Load current state
        const current = await prisma.account.findUnique({
            where: { id },
            select: {
                id: true,
                accountNumber: true,
                name: true,
                description: true,
                type: true,
                currencyId: true,
                parentAccountId: true,
                isDetail: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                createdById: true,
                updatedById: true,
            },
        });
        if (!current) {
            return null;
        }
        // Disallow changing accountNumber
        if (typeof data.accountNumber === 'string') {
            const requested = data.accountNumber.trim().toUpperCase();
            if (requested !== current.accountNumber) {
                throw new Error('INVALID_OPERATION');
            }
        }
        // Build update payload strictly
        const updateData = {};
        if (typeof data.name === 'string') {
            const v = data.name.trim();
            if (!v)
                throw new Error('NAME_REQUIRED');
            updateData.name = v;
        }
        if (typeof data.description === 'string') {
            const v = data.description.trim();
            updateData.description = v.length > 0 ? v : null;
        }
        else if (data.description === null) {
            updateData.description = null;
        }
        if (typeof data.type === 'string') {
            if (!isValidAccountType(data.type)) {
                throw new Error('INVALID_ACCOUNT_TYPE');
            }
            updateData.type = data.type;
        }
        if (typeof data.currencyId === 'number') {
            if (!Number.isInteger(data.currencyId) || data.currencyId <= 0) {
                throw new Error('INVALID_CURRENCY');
            }
            await ensureCurrencyExists(data.currencyId);
            updateData.currencyId = data.currencyId;
        }
        if (typeof data.parentAccountId === 'number') {
            if (!Number.isInteger(data.parentAccountId) || data.parentAccountId <= 0) {
                throw new Error('INVALID_PARENT');
            }
            if (data.parentAccountId === id) {
                throw new Error('INVALID_PARENT');
            }
            await ensureParentExists(data.parentAccountId);
            updateData.parentAccountId = data.parentAccountId;
        }
        else if (data.parentAccountId === null) {
            updateData.parentAccountId = null;
        }
        if (typeof data.isDetail === 'boolean') {
            updateData.isDetail = data.isDetail;
        }
        if (typeof data.isActive === 'boolean') {
            updateData.isActive = data.isActive;
        }
        if (requestContext?.userId) {
            updateData.updatedById = requestContext.userId;
        }
        // Structural/type compatibility validation (CK_nature_by_type) prior to update
        {
            const newType = (typeof data.type === 'string' ? data.type : current.type);
            const newParentId = data.parentAccountId !== undefined
                ? (data.parentAccountId === null ? null : data.parentAccountId)
                : (current.parentAccountId ?? null);
            // Additional LEAF_ONLY rule: cannot set isDetail false on leaf-only types
            if (LEAF_ONLY_TYPES.includes(newType) && data.isDetail === false) {
                throw new Error('INVALID_ACCOUNT_TYPE');
            }
            await this.validateAccountTypeAndStructure({
                type: newType,
                parentAccountId: newParentId,
                accountIdToUpdate: id,
            });
        }
        try {
            const updated = await prisma.account.update({
                where: { id },
                data: updateData,
                include: ACCOUNT_INCLUDE,
            });
            // Audit success
            await prisma.userAuditLog.create({
                data: {
                    userId: requestContext?.userId,
                    action: client_1.AuditAction.update,
                    entityType: 'account',
                    entityId: updated.id,
                    newData: {
                        id: updated.id,
                        accountNumber: updated.accountNumber,
                        name: updated.name,
                        type: updated.type,
                        currencyId: updated.currencyId,
                        parentAccountId: updated.parentAccountId ?? undefined,
                        isDetail: updated.isDetail,
                        isActive: updated.isActive,
                    },
                    ipAddress: requestContext?.ipAddress,
                    userAgent: requestContext?.userAgent,
                    success: true,
                    performedAt: new Date(),
                },
            });
            return mapAccount(updated);
        }
        catch (error) {
            if (error?.code === 'P2002') {
                throw new Error('DUPLICATE_ACCOUNT_NUMBER');
            }
            if (error?.code === 'P2025') {
                return null;
            }
            // Audit failure
            try {
                await prisma.userAuditLog.create({
                    data: {
                        userId: requestContext?.userId,
                        action: client_1.AuditAction.update,
                        entityType: 'account',
                        entityId: id,
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        ipAddress: requestContext?.ipAddress,
                        userAgent: requestContext?.userAgent,
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
    async deleteAccount(id, requestContext) {
        try {
            const exists = await prisma.account.findUnique({
                where: { id },
                select: { id: true, isActive: true },
            });
            if (!exists) {
                return false;
            }
            // Prevent deletion when there are subaccounts or accounting movements
            const childCount = await prisma.account.count({
                where: { parentAccountId: id, isActive: true },
            });
            if (childCount > 0) {
                // Audit conflict
                await prisma.userAuditLog.create({
                    data: {
                        userId: requestContext?.userId,
                        action: client_1.AuditAction.delete,
                        entityType: 'account',
                        entityId: id,
                        errorMessage: 'CONFLICT_CHILD_ACCOUNTS',
                        ipAddress: requestContext?.ipAddress,
                        userAgent: requestContext?.userAgent,
                        success: false,
                        performedAt: new Date(),
                    },
                });
                throw new Error('CONFLICT_CHILD_ACCOUNTS');
            }
            // Note: Movement checks (journal/ledger) are not implemented because those tables do not exist yet.
            // Soft delete: mark inactive and set updatedById if available
            const deleteData = {
                isActive: false,
                ...(requestContext?.userId ? { updatedById: requestContext.userId } : {}),
            };
            await prisma.account.update({
                where: { id },
                data: deleteData,
            });
            await prisma.userAuditLog.create({
                data: {
                    userId: requestContext?.userId,
                    action: client_1.AuditAction.delete,
                    entityType: 'account',
                    entityId: id,
                    ipAddress: requestContext?.ipAddress,
                    userAgent: requestContext?.userAgent,
                    success: true,
                    performedAt: new Date(),
                },
            });
            return true;
        }
        catch (error) {
            if (error?.code === 'P2025') {
                return false;
            }
            try {
                await prisma.userAuditLog.create({
                    data: {
                        userId: requestContext?.userId,
                        action: client_1.AuditAction.delete,
                        entityType: 'account',
                        entityId: id,
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        ipAddress: requestContext?.ipAddress,
                        userAgent: requestContext?.userAgent,
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
     * Bulk import accounts with hierarchical order resolution.
     * Uses parentAccountNumber to resolve parentAccountId during import.
     * Automatically creates missing parent accounts based on account number structure.
     * @param accounts - Array of accounts to import
     * @param requestContext - Request context for audit logging
     * @param updateExisting - If true, update existing accounts instead of failing
     */
    async bulkImport(accounts, requestContext, updateExisting = false) {
        if (!requestContext?.userId) {
            throw new Error('AUTH_REQUIRED');
        }
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        let updatedCount = 0;
        // Normalize account numbers and build lookup
        const normalizedAccounts = accounts.map((acc) => ({
            ...acc,
            accountNumber: acc.accountNumber.trim().toUpperCase(),
            parentAccountNumber: acc.parentAccountNumber?.trim().toUpperCase() || undefined,
            name: acc.name.trim(),
        }));
        // Get default currency for auto-created parent accounts
        const defaultCurrency = await prisma.currency.findFirst({
            where: { isActive: true },
            select: { id: true },
        });
        const defaultCurrencyId = defaultCurrency?.id || 1;
        // Build complete hierarchy including missing parents
        const allAccountsToCreate = this.buildCompleteHierarchy(normalizedAccounts, defaultCurrencyId);
        // Sort accounts by hierarchy level (parents first)
        const sortedAccounts = this.sortByHierarchy(allAccountsToCreate);
        // Map to track created account numbers -> IDs (within this import)
        const createdAccountMap = new Map();
        // Also load existing accounts to resolve parent references
        const existingAccounts = await prisma.account.findMany({
            select: { id: true, accountNumber: true },
        });
        const existingMap = new Map();
        existingAccounts.forEach((a) => existingMap.set(a.accountNumber, a.id));
        // Process within a transaction for atomicity
        // Increase timeout to 120 seconds for large imports with auto-created parents
        await prisma.$transaction(async (tx) => {
            for (const account of sortedAccounts) {
                try {
                    // Check for duplicates in DB
                    const existingId = existingMap.get(account.accountNumber);
                    if (existingId) {
                        // Skip silently if this is an auto-generated parent
                        if (account._autoGenerated) {
                            createdAccountMap.set(account.accountNumber, existingId);
                            continue;
                        }
                        // If updateExisting is true, update the account instead of failing
                        if (updateExisting) {
                            // Resolve parentAccountId for update
                            let parentAccountId = null;
                            if (account.parentAccountNumber) {
                                let resolvedParentNumber = account.parentAccountNumber;
                                // Check if parentAccountNumber is a name instead of a code
                                const isCodeFormat = /^\d{3}-\d{3}-\d{3}$/.test(account.parentAccountNumber);
                                if (!isCodeFormat) {
                                    const resolvedCode = resolveParentNameToCode(account.parentAccountNumber);
                                    if (resolvedCode) {
                                        resolvedParentNumber = resolvedCode;
                                    }
                                }
                                const importedParentId = createdAccountMap.get(resolvedParentNumber);
                                if (importedParentId) {
                                    parentAccountId = importedParentId;
                                }
                                else {
                                    const dbParentId = existingMap.get(resolvedParentNumber);
                                    if (dbParentId) {
                                        parentAccountId = dbParentId;
                                    }
                                }
                            }
                            // Update existing account with new fields
                            const isDetailUpdate = account.isDetail ?? true;
                            await tx.account.update({
                                where: { id: existingId },
                                data: {
                                    name: account.name,
                                    description: account.description?.trim() || null,
                                    type: normalizeAccountType(account.type),
                                    detailType: account.detailType?.trim() || null,
                                    currencyId: isDetailUpdate && account.currencyId ? account.currencyId : null,
                                    currency: account.currency,
                                    parentAccountId,
                                    isDetail: isDetailUpdate,
                                    isActive: account.isActive ?? true,
                                    updatedById: requestContext.userId,
                                },
                            });
                            createdAccountMap.set(account.accountNumber, existingId);
                            results.push({
                                accountNumber: account.accountNumber,
                                success: true,
                                id: existingId,
                            });
                            updatedCount++;
                            successCount++;
                            continue;
                        }
                        // Default behavior: fail on duplicate
                        results.push({
                            accountNumber: account.accountNumber,
                            success: false,
                            error: 'DUPLICATE_ACCOUNT_NUMBER',
                        });
                        errorCount++;
                        continue;
                    }
                    // Resolve parentAccountId
                    let parentAccountId = null;
                    if (account.parentAccountNumber) {
                        let resolvedParentNumber = account.parentAccountNumber;
                        // Check if parentAccountNumber is a name instead of a code
                        // If it doesn't match XXX-XXX-XXX format, try to resolve by name
                        const isCodeFormat = /^\d{3}-\d{3}-\d{3}$/.test(account.parentAccountNumber);
                        if (!isCodeFormat) {
                            const resolvedCode = resolveParentNameToCode(account.parentAccountNumber);
                            if (resolvedCode) {
                                resolvedParentNumber = resolvedCode;
                            }
                        }
                        // First check if parent was created in this import
                        const importedParentId = createdAccountMap.get(resolvedParentNumber);
                        if (importedParentId) {
                            parentAccountId = importedParentId;
                        }
                        else {
                            // Check in existing DB accounts
                            const dbParentId = existingMap.get(resolvedParentNumber);
                            if (dbParentId) {
                                parentAccountId = dbParentId;
                            }
                            else {
                                results.push({
                                    accountNumber: account.accountNumber,
                                    success: false,
                                    error: `Cuenta padre no encontrada: ${account.parentAccountNumber}`,
                                });
                                errorCount++;
                                continue;
                            }
                        }
                    }
                    // Validate currency exists only if provided and account is detail
                    const isDetail = account.isDetail ?? true;
                    let currencyId = null;
                    if (isDetail && account.currencyId) {
                        const currency = await tx.currency.findUnique({
                            where: { id: account.currencyId },
                            select: { id: true },
                        });
                        if (!currency) {
                            results.push({
                                accountNumber: account.accountNumber,
                                success: false,
                                error: 'INVALID_CURRENCY',
                            });
                            errorCount++;
                            continue;
                        }
                        currencyId = account.currencyId;
                    }
                    // Create account with new fields
                    const created = await tx.account.create({
                        data: {
                            code: account.accountNumber, // Use accountNumber as code
                            accountNumber: account.accountNumber,
                            name: account.name,
                            description: account.description?.trim() || null,
                            type: normalizeAccountType(account.type),
                            detailType: account.detailType?.trim() || null,
                            currencyId,
                            currency: account.currency,
                            parentAccountId,
                            isDetail,
                            isActive: account.isActive ?? true,
                            createdById: requestContext.userId,
                        },
                    });
                    // Track created account for child resolution
                    createdAccountMap.set(account.accountNumber, created.id);
                    existingMap.set(account.accountNumber, created.id);
                    // Only add to results if not auto-generated
                    if (!account._autoGenerated) {
                        results.push({
                            accountNumber: account.accountNumber,
                            success: true,
                            id: created.id,
                        });
                        successCount++;
                    }
                }
                catch (err) {
                    // Skip errors for auto-generated accounts (they might already exist)
                    if (account._autoGenerated) {
                        continue;
                    }
                    const errorMsg = err?.code === 'P2002'
                        ? 'Cuenta ya existe en la base de datos'
                        : (err instanceof Error ? err.message : 'Unknown error');
                    results.push({
                        accountNumber: account.accountNumber,
                        success: false,
                        error: errorMsg,
                    });
                    errorCount++;
                }
            }
            // Note: We no longer throw on all failures - let partial imports succeed
            // and return detailed results to the client
        }, {
            timeout: 120000, // 120 seconds timeout for large imports with auto-created parents
            maxWait: 15000, // Max time to wait for transaction slot
        });
        // Audit log the bulk import
        await prisma.userAuditLog.create({
            data: {
                userId: requestContext.userId,
                action: client_1.AuditAction.create,
                entityType: 'account',
                newData: {
                    operation: 'bulk_import',
                    totalProcessed: accounts.length,
                    successCount,
                    updatedCount,
                    errorCount,
                    updateExisting,
                },
                ipAddress: requestContext.ipAddress,
                userAgent: requestContext.userAgent,
                success: successCount > 0,
                performedAt: new Date(),
            },
        });
        return {
            success: successCount > 0,
            totalProcessed: accounts.length,
            successCount,
            errorCount,
            updatedCount,
            results,
        };
    }
    /**
     * Infer account type from account number based on first digit.
     * 1xx = Activo, 2xx = Pasivo, 3xx = Capital, 4xx = Ingresos, 5xx = Costos, 6xx = Gastos
     */
    inferAccountTypeFromNumber(accountNumber) {
        const firstChar = accountNumber.charAt(0);
        switch (firstChar) {
            case '1': return 'Activo';
            case '2': return 'Pasivo';
            case '3': return 'Capital';
            case '4': return 'Ingresos';
            case '5': return 'Costos';
            case '6': return 'Gastos';
            default: return 'Activo';
        }
    }
    /**
     * Generate a descriptive name for auto-created parent accounts.
     */
    generateParentAccountName(accountNumber) {
        const type = this.inferAccountTypeFromNumber(accountNumber);
        const segments = accountNumber.split('-');
        // Define standard names for common parent accounts
        const standardNames = {
            '100-000-000': 'ACTIVO',
            '110-000-000': 'ACTIVO CORRIENTE',
            '120-000-000': 'ACTIVO NO CORRIENTE',
            '200-000-000': 'PASIVO',
            '210-000-000': 'PASIVO CORRIENTE',
            '220-000-000': 'PASIVO NO CORRIENTE',
            '300-000-000': 'CAPITAL',
            '310-000-000': 'CAPITAL SOCIAL',
            '400-000-000': 'INGRESOS',
            '410-000-000': 'INGRESOS POR SERVICIOS',
            '420-000-000': 'OTROS INGRESOS',
            '500-000-000': 'COSTOS',
            '510-000-000': 'COSTOS DE OPERACION',
            '600-000-000': 'GASTOS',
            '610-000-000': 'GASTOS GENERALES',
        };
        if (standardNames[accountNumber]) {
            return standardNames[accountNumber];
        }
        // Generate a generic name
        return `${type.toUpperCase()} - ${accountNumber}`;
    }
    /**
     * Build complete hierarchy by identifying and creating missing parent accounts.
     * Analyzes account numbers to find gaps in the hierarchy.
     */
    buildCompleteHierarchy(accounts, defaultCurrencyId) {
        const accountSet = new Set(accounts.map(a => a.accountNumber));
        const missingParents = new Map();
        // For each account, trace up the hierarchy and find missing parents
        for (const account of accounts) {
            let parentNumber = account.parentAccountNumber;
            while (parentNumber) {
                // If parent already exists in our import list or we've already added it, stop
                if (accountSet.has(parentNumber) || missingParents.has(parentNumber)) {
                    break;
                }
                // Create the missing parent
                const parentType = this.inferAccountTypeFromNumber(parentNumber);
                const parentName = this.generateParentAccountName(parentNumber);
                // Find what should be this parent's parent
                const grandparentNumber = this.findParentAccountNumber(parentNumber);
                missingParents.set(parentNumber, {
                    accountNumber: parentNumber,
                    name: parentName,
                    type: parentType,
                    currencyId: defaultCurrencyId,
                    parentAccountNumber: grandparentNumber,
                    isDetail: false, // Parent accounts are never detail
                    isActive: true,
                    _autoGenerated: true, // Mark as auto-generated
                });
                // Continue tracing up
                parentNumber = grandparentNumber;
            }
        }
        // Combine original accounts with missing parents
        return [...missingParents.values(), ...accounts];
    }
    /**
     * Find the parent account number based on the structure of the given account number.
     * E.g., 111-100-000 -> 111-000-000 -> 110-000-000 -> 100-000-000 -> null
     */
    findParentAccountNumber(accountNumber) {
        const segments = accountNumber.split('-');
        if (segments.length !== 3)
            return undefined;
        const [first, second, third] = segments;
        const firstNum = parseInt(first, 10);
        const secondNum = parseInt(second, 10);
        const thirdNum = parseInt(third, 10);
        // If third segment has value, zero it out
        if (thirdNum > 0) {
            return `${first}-${second}-000`;
        }
        // If second segment has value, zero it out
        if (secondNum > 0) {
            return `${first}-000-000`;
        }
        // If we're at X00-000-000, find the parent
        const firstDigit = parseInt(first.charAt(0), 10);
        const secondDigit = parseInt(first.charAt(1), 10);
        const thirdDigit = parseInt(first.charAt(2), 10);
        // E.g., 111-000-000 -> 110-000-000
        if (thirdDigit > 0) {
            return `${firstDigit}${secondDigit}0-000-000`;
        }
        // E.g., 110-000-000 -> 100-000-000
        if (secondDigit > 0) {
            return `${firstDigit}00-000-000`;
        }
        // E.g., 100-000-000 has no parent
        return undefined;
    }
    /**
     * Sort accounts so parents come before children.
     * Uses accountNumber structure to determine hierarchy level.
     */
    sortByHierarchy(accounts) {
        // Create a map of accountNumber -> account for quick lookup
        const accountMap = new Map();
        accounts.forEach((a) => accountMap.set(a.accountNumber, a));
        // Calculate depth (number of parent levels) for each account
        const getDepth = (acc) => {
            if (!acc.parentAccountNumber)
                return 0;
            const parent = accountMap.get(acc.parentAccountNumber);
            if (!parent)
                return 0; // Parent is external (already in DB)
            return 1 + getDepth(parent);
        };
        // Sort by depth (ascending) then by accountNumber
        return [...accounts].sort((a, b) => {
            const depthA = getDepth(a);
            const depthB = getDepth(b);
            if (depthA !== depthB)
                return depthA - depthB;
            return a.accountNumber.localeCompare(b.accountNumber);
        });
    }
}
exports.AccountService = AccountService;
