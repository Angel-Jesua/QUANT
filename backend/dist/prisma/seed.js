"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const PROFILE_IMAGE_FOLDER = 'images';
const DEFAULT_PROFILE_IMAGE = `${PROFILE_IMAGE_FOLDER}/default-avatar.svg`;
const ACCOUNTANT_PROFILE_IMAGE = `${PROFILE_IMAGE_FOLDER}/woman.png`;
async function main() {
    console.log('🌱 Starting database seed...');
    // Hash passwords with bcrypt (same as the application does)
    const adminPassword = 'Admin123!';
    const accountantPassword = 'Account123!';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const accountantPasswordHash = await bcrypt.hash(accountantPassword, 10);
    // Create administrator user
    const admin = await prisma.userAccount.upsert({
        where: { email: 'admin@quant.com' },
        update: {
            profileImageUrl: DEFAULT_PROFILE_IMAGE,
            avatarType: client_1.AvatarType.generated,
        },
        create: {
            username: 'admin',
            email: 'admin@quant.com',
            passwordHash: adminPasswordHash,
            fullName: 'Administrator',
            role: client_1.UserRole.administrator,
            avatarType: client_1.AvatarType.generated,
            profileImageUrl: DEFAULT_PROFILE_IMAGE,
            photoRequested: true,
            isActive: true,
            passwordChangedAt: new Date(),
        },
    });
    console.log('✅ Administrator created:', {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        password: adminPassword
    });
    // Create accountant user
    const accountant = await prisma.userAccount.upsert({
        where: { email: 'accountant@quant.com' },
        update: {
            profileImageUrl: ACCOUNTANT_PROFILE_IMAGE,
            avatarType: client_1.AvatarType.uploaded,
        },
        create: {
            username: 'accountant',
            email: 'accountant@quant.com',
            passwordHash: accountantPasswordHash,
            fullName: 'Accountant User',
            role: client_1.UserRole.accountant,
            avatarType: client_1.AvatarType.uploaded,
            profileImageUrl: ACCOUNTANT_PROFILE_IMAGE,
            photoRequested: true,
            isActive: true,
            passwordChangedAt: new Date(),
        },
    });
    console.log('✅ Accountant created:', {
        id: accountant.id,
        username: accountant.username,
        email: accountant.email,
        password: accountantPassword
    });
    // Create some role permissions for both roles
    const modules = ['users', 'reports', 'settings', 'audit'];
    for (const module of modules) {
        // Administrator has full permissions
        await prisma.rolePermission.upsert({
            where: {
                role_module: {
                    role: client_1.UserRole.administrator,
                    module: module
                }
            },
            update: {},
            create: {
                role: client_1.UserRole.administrator,
                module: module,
                canRead: true,
                canCreate: true,
                canUpdate: true,
                canDelete: true,
                createdById: admin.id,
            },
        });
        // Accountant has limited permissions
        await prisma.rolePermission.upsert({
            where: {
                role_module: {
                    role: client_1.UserRole.accountant,
                    module: module
                }
            },
            update: {},
            create: {
                role: client_1.UserRole.accountant,
                module: module,
                canRead: true,
                canCreate: module !== 'settings' && module !== 'users',
                canUpdate: module !== 'settings' && module !== 'users',
                canDelete: false,
                createdById: admin.id,
            },
        });
    }
    console.log('✅ Role permissions created for modules:', modules);
    // Seed base currency USD
    const usd = await prisma.currency.upsert({
        where: { code: 'USD' },
        update: {
            isBaseCurrency: true,
            exchangeRate: new client_1.Prisma.Decimal('1.000000'),
            updatedById: admin.id,
        },
        create: {
            code: 'USD',
            name: 'US Dollar',
            symbol: '$',
            decimalPlaces: 2,
            isBaseCurrency: true,
            exchangeRate: new client_1.Prisma.Decimal('1.000000'),
            isActive: true,
            createdById: admin.id,
        },
    });
    console.log('✅ Base currency created:', { id: usd.id, code: usd.code, symbol: usd.symbol });
    // Seed Nicaraguan Córdoba (NIO)
    const nio = await prisma.currency.upsert({
        where: { code: 'NIO' },
        update: {
            exchangeRate: new client_1.Prisma.Decimal('36.500000'),
            updatedById: admin.id,
        },
        create: {
            code: 'NIO',
            name: 'Córdoba Nicaragüense',
            symbol: 'C$',
            decimalPlaces: 2,
            isBaseCurrency: false,
            exchangeRate: new client_1.Prisma.Decimal('36.500000'), // Approximate exchange rate
            isActive: true,
            createdById: admin.id,
        },
    });
    console.log('✅ Currency created:', { id: nio.id, code: nio.code, symbol: nio.symbol });
    // Seed example clients
    const clientsData = [
        { clientCode: 'CUST-001', taxId: 'RUC001', name: 'Cliente Alfa', email: 'alfa@example.com', phone: '505-555-0001', address: 'Managua', city: 'Managua' },
        { clientCode: 'CUST-002', taxId: 'RUC002', name: 'Cliente Beta', email: 'beta@example.com', phone: '505-555-0002', address: 'León', city: 'León' },
        { clientCode: 'CUST-003', taxId: 'RUC003', name: 'Cliente Gamma', email: 'gamma@example.com', phone: '505-555-0003', address: 'Granada', city: 'Granada' },
    ];
    const clientResults = [];
    for (const c of clientsData) {
        const client = await prisma.client.upsert({
            where: { clientCode: c.clientCode },
            update: {
                name: c.name,
                email: c.email,
                phone: c.phone,
                address: c.address,
                city: c.city,
                currencyId: usd.id,
                isActive: true,
                updatedById: admin.id,
            },
            create: {
                clientCode: c.clientCode,
                taxId: c.taxId,
                name: c.name,
                email: c.email,
                phone: c.phone,
                address: c.address,
                city: c.city,
                currencyId: usd.id,
                isActive: true,
                createdById: admin.id,
            },
        });
        clientResults.push(client);
    }
    console.log(`✅ Clients upserted: ${clientResults.length}`);
    const accountsSeed = [
        // ========================================
        // NIVEL 1 - CUENTAS PADRE PRINCIPALES
        // ========================================
        { code: '100-000-000', name: 'ACTIVO', type: client_1.AccountType.Activo, isDetail: false },
        { code: '200-000-000', name: 'PASIVO', type: client_1.AccountType.Pasivo, isDetail: false },
        { code: '300-000-000', name: 'CAPITAL', type: client_1.AccountType.Capital, isDetail: false },
        { code: '400-000-000', name: 'INGRESOS', type: client_1.AccountType.Ingresos, isDetail: false },
        { code: '500-000-000', name: 'OTROS INGRESOS', type: client_1.AccountType.Ingresos, isDetail: false },
        { code: '600-000-000', name: 'GASTOS', type: client_1.AccountType.Gastos, isDetail: false },
        { code: '700-000-000', name: 'COSTOS', type: client_1.AccountType.Costos, isDetail: false },
        // ========================================
        // NIVEL 2 - SUBCATEGORÍAS
        // ========================================
        // ACTIVO
        { code: '110-000-000', name: 'ACTIVO CORRIENTE', type: client_1.AccountType.Activo, parent: '100-000-000', isDetail: false },
        { code: '120-000-000', name: 'ACTIVO NO CORRIENTE', type: client_1.AccountType.Activo, parent: '100-000-000', isDetail: false },
        // PASIVO
        { code: '210-000-000', name: 'PASIVO CORRIENTE', type: client_1.AccountType.Pasivo, parent: '200-000-000', isDetail: false },
        { code: '220-000-000', name: 'PASIVO NO CORRIENTE', type: client_1.AccountType.Pasivo, parent: '200-000-000', isDetail: false },
        // ========================================
        // NIVEL 3 - GRUPOS DE CUENTAS
        // ========================================
        // ACTIVO CORRIENTE
        { code: '111-000-000', name: 'EFECTIVO Y EQUIVALENTES', type: client_1.AccountType.Activo, parent: '110-000-000', isDetail: false, detailType: 'Efectivo' },
        { code: '112-000-000', name: 'CUENTAS POR COBRAR', type: client_1.AccountType.Activo, parent: '110-000-000', isDetail: false, detailType: 'Cuentas por Cobrar' },
        { code: '113-000-000', name: 'INVENTARIOS', type: client_1.AccountType.Activo, parent: '110-000-000', isDetail: false, detailType: 'Inventario' },
        { code: '114-000-000', name: 'GASTOS PAGADOS POR ANTICIPADO', type: client_1.AccountType.Activo, parent: '110-000-000', isDetail: false, detailType: 'Prepagados' },
        // ACTIVO NO CORRIENTE
        { code: '121-000-000', name: 'PROPIEDAD, PLANTA Y EQUIPO', type: client_1.AccountType.Activo, parent: '120-000-000', isDetail: false, detailType: 'Activo Fijo' },
        { code: '122-000-000', name: 'ACTIVOS INTANGIBLES', type: client_1.AccountType.Activo, parent: '120-000-000', isDetail: false, detailType: 'Intangible' },
        { code: '123-000-000', name: 'INVERSIONES A LARGO PLAZO', type: client_1.AccountType.Activo, parent: '120-000-000', isDetail: false, detailType: 'Inversión' },
        // PASIVO CORRIENTE
        { code: '211-000-000', name: 'CUENTAS POR PAGAR', type: client_1.AccountType.Pasivo, parent: '210-000-000', isDetail: false, detailType: 'Cuentas por Pagar' },
        { code: '212-000-000', name: 'IMPUESTOS POR PAGAR', type: client_1.AccountType.Pasivo, parent: '210-000-000', isDetail: false, detailType: 'Impuestos' },
        { code: '213-000-000', name: 'OBLIGACIONES LABORALES', type: client_1.AccountType.Pasivo, parent: '210-000-000', isDetail: false, detailType: 'Laboral' },
        { code: '214-000-000', name: 'INGRESOS DIFERIDOS', type: client_1.AccountType.Pasivo, parent: '210-000-000', isDetail: false, detailType: 'Diferido' },
        // PASIVO NO CORRIENTE
        { code: '221-000-000', name: 'PRÉSTAMOS BANCARIOS L/P', type: client_1.AccountType.Pasivo, parent: '220-000-000', isDetail: false, detailType: 'Préstamo' },
        { code: '222-000-000', name: 'OTRAS OBLIGACIONES L/P', type: client_1.AccountType.Pasivo, parent: '220-000-000', isDetail: false, detailType: 'Obligación' },
        // CAPITAL
        { code: '310-000-000', name: 'CAPITAL SOCIAL', type: client_1.AccountType.Capital, parent: '300-000-000', isDetail: false },
        { code: '320-000-000', name: 'RESERVAS', type: client_1.AccountType.Capital, parent: '300-000-000', isDetail: false },
        { code: '330-000-000', name: 'RESULTADOS ACUMULADOS', type: client_1.AccountType.Capital, parent: '300-000-000', isDetail: false },
        { code: '340-000-000', name: 'RESULTADO DEL EJERCICIO', type: client_1.AccountType.Capital, parent: '300-000-000', isDetail: false },
        // INGRESOS
        { code: '410-000-000', name: 'INGRESOS POR SERVICIOS LEGALES', type: client_1.AccountType.Ingresos, parent: '400-000-000', isDetail: false, detailType: 'Servicios' },
        { code: '420-000-000', name: 'INGRESOS POR CONSULTORÍA', type: client_1.AccountType.Ingresos, parent: '400-000-000', isDetail: false, detailType: 'Consultoría' },
        // OTROS INGRESOS
        { code: '510-000-000', name: 'INGRESOS FINANCIEROS', type: client_1.AccountType.Ingresos, parent: '500-000-000', isDetail: false, detailType: 'Financiero' },
        { code: '520-000-000', name: 'OTROS INGRESOS NO OPERATIVOS', type: client_1.AccountType.Ingresos, parent: '500-000-000', isDetail: false, detailType: 'No Operativo' },
        // GASTOS
        { code: '610-000-000', name: 'GASTOS DE PERSONAL', type: client_1.AccountType.Gastos, parent: '600-000-000', isDetail: false, detailType: 'Personal' },
        { code: '620-000-000', name: 'GASTOS ADMINISTRATIVOS', type: client_1.AccountType.Gastos, parent: '600-000-000', isDetail: false, detailType: 'Administrativo' },
        { code: '630-000-000', name: 'GASTOS DE OPERACIÓN', type: client_1.AccountType.Gastos, parent: '600-000-000', isDetail: false, detailType: 'Operación' },
        { code: '640-000-000', name: 'GASTOS FINANCIEROS', type: client_1.AccountType.Gastos, parent: '600-000-000', isDetail: false, detailType: 'Financiero' },
        { code: '650-000-000', name: 'DEPRECIACIONES Y AMORTIZACIONES', type: client_1.AccountType.Gastos, parent: '600-000-000', isDetail: false, detailType: 'Depreciación' },
        // COSTOS
        { code: '710-000-000', name: 'COSTO DE SERVICIOS', type: client_1.AccountType.Costos, parent: '700-000-000', isDetail: false, detailType: 'Costo Servicio' },
        { code: '720-000-000', name: 'COSTOS DIRECTOS', type: client_1.AccountType.Costos, parent: '700-000-000', isDetail: false, detailType: 'Costo Directo' },
        // ========================================
        // NIVEL 4 - CUENTAS DE DETALLE (Ejemplos)
        // ========================================
        // Efectivo y Equivalentes
        { code: '111-001-000', name: 'Caja General', type: client_1.AccountType.Activo, parent: '111-000-000', isDetail: true, detailType: 'Efectivo' },
        { code: '111-002-000', name: 'Caja Chica', type: client_1.AccountType.Activo, parent: '111-000-000', isDetail: true, detailType: 'Efectivo' },
        { code: '111-003-000', name: 'Bancos Moneda Nacional', type: client_1.AccountType.Activo, parent: '111-000-000', isDetail: true, detailType: 'Banco' },
        { code: '111-004-000', name: 'Bancos Moneda Extranjera', type: client_1.AccountType.Activo, parent: '111-000-000', isDetail: true, detailType: 'Banco' },
        // Cuentas por Cobrar
        { code: '112-001-000', name: 'Clientes Nacionales', type: client_1.AccountType.Activo, parent: '112-000-000', isDetail: true, detailType: 'Cliente' },
        { code: '112-002-000', name: 'Clientes Extranjeros', type: client_1.AccountType.Activo, parent: '112-000-000', isDetail: true, detailType: 'Cliente' },
        { code: '112-003-000', name: 'Anticipos a Proveedores', type: client_1.AccountType.Activo, parent: '112-000-000', isDetail: true, detailType: 'Anticipo' },
        // Cuentas por Pagar
        { code: '211-001-000', name: 'Proveedores Nacionales', type: client_1.AccountType.Pasivo, parent: '211-000-000', isDetail: true, detailType: 'Proveedor' },
        { code: '211-002-000', name: 'Proveedores Extranjeros', type: client_1.AccountType.Pasivo, parent: '211-000-000', isDetail: true, detailType: 'Proveedor' },
        // Impuestos por Pagar
        { code: '212-001-000', name: 'IVA por Pagar', type: client_1.AccountType.Pasivo, parent: '212-000-000', isDetail: true, detailType: 'IVA' },
        { code: '212-002-000', name: 'IR por Pagar', type: client_1.AccountType.Pasivo, parent: '212-000-000', isDetail: true, detailType: 'IR' },
        { code: '212-003-000', name: 'Retenciones por Pagar', type: client_1.AccountType.Pasivo, parent: '212-000-000', isDetail: true, detailType: 'Retención' },
        // Capital Social
        { code: '310-001-000', name: 'Capital Autorizado', type: client_1.AccountType.Capital, parent: '310-000-000', isDetail: true },
        { code: '310-002-000', name: 'Capital Suscrito', type: client_1.AccountType.Capital, parent: '310-000-000', isDetail: true },
        { code: '310-003-000', name: 'Capital Pagado', type: client_1.AccountType.Capital, parent: '310-000-000', isDetail: true },
        // Ingresos por Servicios Legales
        { code: '410-001-000', name: 'Honorarios por Consultas', type: client_1.AccountType.Ingresos, parent: '410-000-000', isDetail: true, detailType: 'Honorario' },
        { code: '410-002-000', name: 'Honorarios por Litigios', type: client_1.AccountType.Ingresos, parent: '410-000-000', isDetail: true, detailType: 'Honorario' },
        { code: '410-003-000', name: 'Honorarios por Contratos', type: client_1.AccountType.Ingresos, parent: '410-000-000', isDetail: true, detailType: 'Honorario' },
        // Gastos de Personal
        { code: '610-001-000', name: 'Sueldos y Salarios', type: client_1.AccountType.Gastos, parent: '610-000-000', isDetail: true, detailType: 'Salario' },
        { code: '610-002-000', name: 'Prestaciones Sociales', type: client_1.AccountType.Gastos, parent: '610-000-000', isDetail: true, detailType: 'Prestación' },
        { code: '610-003-000', name: 'INSS Patronal', type: client_1.AccountType.Gastos, parent: '610-000-000', isDetail: true, detailType: 'INSS' },
        { code: '610-004-000', name: 'INATEC', type: client_1.AccountType.Gastos, parent: '610-000-000', isDetail: true, detailType: 'INATEC' },
        // Gastos Administrativos
        { code: '620-001-000', name: 'Alquiler de Oficina', type: client_1.AccountType.Gastos, parent: '620-000-000', isDetail: true, detailType: 'Alquiler' },
        { code: '620-002-000', name: 'Servicios Públicos', type: client_1.AccountType.Gastos, parent: '620-000-000', isDetail: true, detailType: 'Servicio' },
        { code: '620-003-000', name: 'Papelería y Útiles', type: client_1.AccountType.Gastos, parent: '620-000-000', isDetail: true, detailType: 'Papelería' },
        { code: '620-004-000', name: 'Comunicaciones', type: client_1.AccountType.Gastos, parent: '620-000-000', isDetail: true, detailType: 'Comunicación' },
    ];
    const accountIdByCode = new Map();
    let accountsUpserted = 0;
    for (const a of accountsSeed) {
        const parentId = a.parent ? accountIdByCode.get(a.parent) ?? null : null;
        // Solo asignar moneda a cuentas de detalle
        const currencyIdValue = a.isDetail ? usd.id : null;
        const acc = await prisma.account.upsert({
            where: { code: a.code },
            update: {
                accountNumber: a.code, // Mantener sincronizado
                name: a.name,
                type: a.type,
                detailType: a.detailType ?? null,
                isDetail: a.isDetail,
                parentAccountId: parentId,
                currencyId: currencyIdValue,
                isActive: true,
                updatedById: admin.id,
            },
            create: {
                code: a.code,
                accountNumber: a.code, // Usar el mismo código como accountNumber
                name: a.name,
                type: a.type,
                detailType: a.detailType ?? null,
                currencyId: currencyIdValue,
                parentAccountId: parentId,
                isDetail: a.isDetail,
                isActive: true,
                createdById: admin.id,
            },
        });
        accountIdByCode.set(a.code, acc.id);
        accountsUpserted++;
    }
    console.log(`✅ Accounts upserted: ${accountsUpserted}`);
    console.log('\n📝 CREDENTIALS FOR LOGIN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Administrator:');
    console.log('  Email: admin@quant.com');
    console.log('  Password: Admin123!');
    console.log('');
    console.log('Accountant:');
    console.log('  Email: accountant@quant.com');
    console.log('  Password: Account123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ Database seed completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
