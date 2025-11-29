"use strict";
/**
 * Script para crear cuentas contables base del catálogo IURIS CONSULTUS
 * Estas son las cuentas padre/agrupación que se crean automáticamente
 * Las cuentas de detalle se importan desde el Excel
 *
 * Ejecutar con: npx ts-node prisma/seed-accounts.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Catálogo de cuentas padre/agrupación basado en el Excel de IURIS CONSULTUS
const accounts = [
    // ========================================
    // ACTIVO (1xx)
    // ========================================
    { code: '100-000-000', name: 'ACTIVO', type: client_1.AccountType.Activo, detailType: 'ACTIVO', isDetail: false },
    // Activo Corriente (11x)
    { code: '110-000-000', name: 'ACTIVO CORRIENTE', type: client_1.AccountType.Activo, detailType: 'ACTIVO CORRIENTE', isDetail: false, parentCode: '100-000-000' },
    { code: '111-000-000', name: 'EFECTIVO Y EQUIVALENTE DE EFECTIVO', type: client_1.AccountType.Activo, detailType: 'EFECTIVO Y EQUIVALENTE DE EFECTIVO', isDetail: false, parentCode: '110-000-000' },
    { code: '111-100-000', name: 'CAJA GENERAL C$', type: client_1.AccountType.Activo, detailType: 'CAJA GENERAL C$', isDetail: false, parentCode: '111-000-000' },
    { code: '111-200-000', name: 'BANCOS MONEDA NACIONAL', type: client_1.AccountType.Activo, detailType: 'BANCOS MONEDA NACIONAL', isDetail: false, parentCode: '111-000-000' },
    { code: '111-300-000', name: 'BANCOS MONEDA EXTRANJERA', type: client_1.AccountType.Activo, detailType: 'BANCOS MONEDA EXTRANJERA', isDetail: false, parentCode: '111-000-000' },
    { code: '112-000-000', name: 'CUENTAS POR COBRAR', type: client_1.AccountType.Activo, detailType: 'CUENTAS POR COBRAR', isDetail: false, parentCode: '110-000-000' },
    { code: '112-100-000', name: 'CUENTAS POR COBRAR CLIENTES', type: client_1.AccountType.Activo, detailType: 'CUENTAS POR COBRAR CLIENTES', isDetail: false, parentCode: '112-000-000' },
    { code: '113-000-000', name: 'PAGOS ANTICIPADOS', type: client_1.AccountType.Activo, detailType: 'PAGOS ANTICIPADOS', isDetail: false, parentCode: '110-000-000' },
    { code: '114-000-000', name: 'DEPRECIACION ACUMULADA', type: client_1.AccountType.Activo, detailType: 'DEPRECIACION ACUMULADA', isDetail: false, parentCode: '110-000-000' },
    // Activo No Corriente (12x)
    { code: '120-000-000', name: 'ACTIVOS NO CORRIENTES', type: client_1.AccountType.Activo, detailType: 'ACTIVOS NO CORRIENTES', isDetail: false, parentCode: '100-000-000' },
    { code: '121-000-000', name: 'PROPIEDAD PLANTA Y EQUIPO', type: client_1.AccountType.Activo, detailType: 'PROPIEDAD PLANTA Y EQUIPO', isDetail: false, parentCode: '120-000-000' },
    { code: '121-100-000', name: 'MOBILIARIO Y EQUIPO DE OFICINA', type: client_1.AccountType.Activo, detailType: 'MOBILIARIO Y EQUIPO DE OFICINA', isDetail: false, parentCode: '121-000-000' },
    // ========================================
    // PASIVO (2xx)
    // ========================================
    { code: '200-000-000', name: 'PASIVO', type: client_1.AccountType.Pasivo, detailType: 'PASIVO', isDetail: false },
    // Pasivo Corriente (21x)
    { code: '210-000-000', name: 'PASIVO CORRIENTE', type: client_1.AccountType.Pasivo, detailType: 'PASIVO CORRIENTE', isDetail: false, parentCode: '200-000-000' },
    { code: '211-000-000', name: 'CUENTAS POR PAGAR', type: client_1.AccountType.Pasivo, detailType: 'CUENTAS POR PAGAR', isDetail: false, parentCode: '210-000-000' },
    { code: '211-100-000', name: 'CUENTAS POR PAGAR PROVEEDORES', type: client_1.AccountType.Pasivo, detailType: 'CUENTAS POR PAGAR PROVEEDORES', isDetail: false, parentCode: '211-000-000' },
    { code: '211-200-000', name: 'CUENTAS POR PAGAR A SOCIOS', type: client_1.AccountType.Pasivo, detailType: 'CUENTAS POR PAGAR A SOCIOS', isDetail: false, parentCode: '211-000-000' },
    { code: '211-300-000', name: 'OTRAS CUENTAS POR PAGAR', type: client_1.AccountType.Pasivo, detailType: 'OTRAS CUENTAS POR PAGAR', isDetail: false, parentCode: '211-000-000' },
    { code: '211-400-000', name: 'IMPUESTOS A PAGAR', type: client_1.AccountType.Pasivo, detailType: 'IMPUESTOS A PAGAR', isDetail: false, parentCode: '211-000-000' },
    { code: '211-500-000', name: 'GASTOS ACUMULADOS POR PAGAR', type: client_1.AccountType.Pasivo, detailType: 'GASTOS ACUMULADOS POR PAGAR', isDetail: false, parentCode: '211-000-000' },
    { code: '211-600-000', name: 'ANTICIPOS CLIENTES', type: client_1.AccountType.Pasivo, detailType: 'ANTICIPOS CLIENTES', isDetail: false, parentCode: '211-000-000' },
    { code: '212-000-000', name: 'RETENCIONES', type: client_1.AccountType.Pasivo, detailType: 'RETENCIONES', isDetail: false, parentCode: '210-000-000' },
    { code: '212-100-000', name: 'RETENCIONES A PAGAR', type: client_1.AccountType.Pasivo, detailType: 'RETENCIONES A PAGAR', isDetail: false, parentCode: '212-000-000' },
    { code: '213-000-000', name: 'PROVISIONES', type: client_1.AccountType.Pasivo, detailType: 'PROVISIONES', isDetail: false, parentCode: '210-000-000' },
    // Pasivo No Corriente (22x)
    { code: '220-000-000', name: 'PASIVO NO CORRIENTE', type: client_1.AccountType.Pasivo, detailType: 'PASIVO NO CORRIENTE', isDetail: false, parentCode: '200-000-000' },
    { code: '221-000-000', name: 'PRESTAMOS', type: client_1.AccountType.Pasivo, detailType: 'PRESTAMOS', isDetail: false, parentCode: '220-000-000' },
    { code: '221-100-000', name: 'PRESTAMOS Y DOCUMENTOS A PAGAR LARGO PLAZO', type: client_1.AccountType.Pasivo, detailType: 'PRESTAMOS Y DOCUMENTOS A PAGAR LARGO PLAZO', isDetail: false, parentCode: '221-000-000' },
    // ========================================
    // CAPITAL (3xx)
    // ========================================
    { code: '300-000-000', name: 'CAPITAL', type: client_1.AccountType.Capital, detailType: 'CAPITAL', isDetail: false },
    { code: '310-000-000', name: 'CAPITAL', type: client_1.AccountType.Capital, detailType: 'CAPITAL', isDetail: false, parentCode: '300-000-000' },
    { code: '311-000-000', name: 'CAPITAL SOCIAL AUTORIZADO', type: client_1.AccountType.Capital, detailType: 'CAPITAL SOCIAL AUTORIZADO', isDetail: false, parentCode: '310-000-000' },
    { code: '311-100-000', name: 'CAPITAL SOCIAL PAGADO', type: client_1.AccountType.Capital, detailType: 'CAPITAL SOCIAL PAGADO', isDetail: false, parentCode: '311-000-000' },
    { code: '312-000-000', name: 'UTILIDADES', type: client_1.AccountType.Capital, detailType: 'UTILIDADES', isDetail: false, parentCode: '310-000-000' },
    // ========================================
    // INGRESOS (4xx)
    // ========================================
    { code: '400-000-000', name: 'INGRESOS', type: client_1.AccountType.Ingresos, detailType: 'INGRESOS', isDetail: false },
    { code: '410-000-000', name: 'INGRESOS POR SERVICIOS', type: client_1.AccountType.Ingresos, detailType: 'INGRESOS POR SERVICIOS', isDetail: false, parentCode: '400-000-000' },
    { code: '411-000-000', name: 'INGRESOS POR PRESTACION DE SERVICIOS', type: client_1.AccountType.Ingresos, detailType: 'INGRESOS POR PRESTACION DE SERVICIOS', isDetail: false, parentCode: '410-000-000' },
    { code: '411-100-000', name: 'INGRESOS POR SERVICIOS/LITIGIO', type: client_1.AccountType.Ingresos, detailType: 'INGRESOS POR SERVICIOS/LITIGIO', isDetail: false, parentCode: '411-000-000' },
    { code: '411-200-000', name: 'INGRESOS POR SERVICIOS/CORPORATIVO', type: client_1.AccountType.Ingresos, detailType: 'INGRESOS POR SERVICIOS/CORPORATIVO', isDetail: false, parentCode: '411-000-000' },
    { code: '411-300-000', name: 'INGRESOS POR SERVICIOS/TRIBUTARIO', type: client_1.AccountType.Ingresos, detailType: 'INGRESOS POR SERVICIOS/TRIBUTARIO', isDetail: false, parentCode: '411-000-000' },
    { code: '411-400-000', name: 'INGRESOS POR SERVICIOS/ ADMINISTRACION-CONTABLE', type: client_1.AccountType.Ingresos, detailType: 'INGRESOS POR SERVICIOS/ ADMINISTRACION-CONTABLE', isDetail: false, parentCode: '411-000-000' },
    { code: '411-500-000', name: 'INGRESOS POR SERVICIOS NUEVAS TECNOLOGIAS', type: client_1.AccountType.Ingresos, detailType: 'INGRESOS POR SERVICIOS NUEVAS TECNOLOGIAS', isDetail: false, parentCode: '411-000-000' },
    { code: '412-000-000', name: 'DESCUENTOS', type: client_1.AccountType.Ingresos, detailType: 'DESCUENTOS', isDetail: false, parentCode: '410-000-000' },
    { code: '412-100-000', name: 'DESCUENTOS POR SERVICIOS', type: client_1.AccountType.Ingresos, detailType: 'DESCUENTOS POR SERVICIOS', isDetail: false, parentCode: '412-000-000' },
    { code: '420-000-000', name: 'OTROS INGRESOS', type: client_1.AccountType.Ingresos, detailType: 'OTROS INGRESOS', isDetail: false, parentCode: '400-000-000' },
    { code: '421-000-000', name: 'PRODUCTOS FINANCIEROS', type: client_1.AccountType.Ingresos, detailType: 'PRODUCTOS FINANCIEROS', isDetail: false, parentCode: '420-000-000' },
    // ========================================
    // COSTOS (5xx)
    // ========================================
    { code: '500-000-000', name: 'COSTOS', type: client_1.AccountType.Costos, detailType: 'COSTOS', isDetail: false },
    { code: '510-000-000', name: 'COSTOS DE ACTIVIDADES ECONOMICAS', type: client_1.AccountType.Costos, detailType: 'COSTOS DE ACTIVIDADES ECONOMICAS', isDetail: false, parentCode: '500-000-000' },
    { code: '511-000-000', name: 'SERVICIOS', type: client_1.AccountType.Costos, detailType: 'SERVICIOS', isDetail: false, parentCode: '510-000-000' },
    // ========================================
    // GASTOS (6xx)
    // ========================================
    { code: '600-000-000', name: 'GASTOS', type: client_1.AccountType.Gastos, detailType: 'GASTOS', isDetail: false },
    { code: '610-000-000', name: 'GASTOS GENERALES', type: client_1.AccountType.Gastos, detailType: 'GASTOS GENERALES', isDetail: false, parentCode: '600-000-000' },
    { code: '611-000-000', name: 'GASTOS ADMINISTRATIVOS', type: client_1.AccountType.Gastos, detailType: 'GASTOS ADMINISTRATIVOS', isDetail: false, parentCode: '610-000-000' },
    { code: '611-100-000', name: 'PAGOS Y BENEFICIOS A EMPLEADOS', type: client_1.AccountType.Gastos, detailType: 'PAGOS Y BENEFICIOS A EMPLEADOS', isDetail: false, parentCode: '611-000-000' },
    { code: '611-200-000', name: 'OBLIGACIONES A EMPLEADOS', type: client_1.AccountType.Gastos, detailType: 'OBLIGACIONES A EMPLEADOS', isDetail: false, parentCode: '611-000-000' },
    { code: '611-300-000', name: 'GASTOS DE VIAJES', type: client_1.AccountType.Gastos, detailType: 'GASTOS DE VIAJES', isDetail: false, parentCode: '611-000-000' },
    { code: '611-400-000', name: 'IMPUESTOS DE PLANILLAS', type: client_1.AccountType.Gastos, detailType: 'IMPUESTOS DE PLANILLAS', isDetail: false, parentCode: '611-000-000' },
    { code: '611-500-000', name: 'SERVICIOS BASICOS Y OTROS', type: client_1.AccountType.Gastos, detailType: 'SERVICIOS BASICOS Y OTROS', isDetail: false, parentCode: '611-000-000' },
    { code: '611-600-000', name: 'MATERIALES Y SUMINISTROS', type: client_1.AccountType.Gastos, detailType: 'MATERIALES Y SUMINISTROS', isDetail: false, parentCode: '611-000-000' },
    { code: '611-700-000', name: 'MANTENIMIENTO DE INSTALACIONES Y EQUIPOS', type: client_1.AccountType.Gastos, detailType: 'MANTENIMIENTO DE INSTALACIONES Y EQUIPOS', isDetail: false, parentCode: '611-000-000' },
    { code: '611-800-000', name: 'GASTOS PUBLICITARIOS', type: client_1.AccountType.Gastos, detailType: 'GASTOS PUBLICITARIOS', isDetail: false, parentCode: '611-000-000' },
    { code: '611-900-000', name: 'LICENCIAS', type: client_1.AccountType.Gastos, detailType: 'LICENCIAS', isDetail: false, parentCode: '611-000-000' },
    { code: '612-000-000', name: 'OTROS GASTOS', type: client_1.AccountType.Gastos, detailType: 'OTROS GASTOS', isDetail: false, parentCode: '610-000-000' },
    { code: '612-100-000', name: 'GASTOS FINANCIEROS', type: client_1.AccountType.Gastos, detailType: 'GASTOS FINANCIEROS', isDetail: false, parentCode: '612-000-000' },
    { code: '612-200-000', name: 'IMPUESTOS MUNICIPALES', type: client_1.AccountType.Gastos, detailType: 'IMPUESTOS MUNICIPALES', isDetail: false, parentCode: '612-000-000' },
    { code: '612-300-000', name: 'SEGUROS', type: client_1.AccountType.Gastos, detailType: 'SEGUROS', isDetail: false, parentCode: '612-000-000' },
    { code: '612-400-000', name: 'GASTOS POR SERVICIOS LEGALES', type: client_1.AccountType.Gastos, detailType: 'GASTOS POR SERVICIOS LEGALES', isDetail: false, parentCode: '612-000-000' },
    { code: '612-500-000', name: 'GASTOS DE SOCIOS', type: client_1.AccountType.Gastos, detailType: 'GASTOS DE SOCIOS', isDetail: false, parentCode: '612-000-000' },
    { code: '612-600-000', name: 'Gasto por Depreciacion', type: client_1.AccountType.Gastos, detailType: 'Gasto por Depreciacion', isDetail: false, parentCode: '612-000-000' },
    { code: '613-000-000', name: 'GASTOS NO DEDUCIBLES', type: client_1.AccountType.Gastos, detailType: 'GASTOS NO DEDUCIBLES', isDetail: false, parentCode: '610-000-000' },
];
async function main() {
    console.log('🏦 Seed de Cuentas Contables - IURIS CONSULTUS Nicaragua S.A');
    console.log('='.repeat(60));
    // Verificar si ya existen cuentas
    const existingCount = await prisma.account.count();
    if (existingCount > 0) {
        console.log(`\n⚠️  Ya existen ${existingCount} cuentas en la base de datos.`);
        console.log('   Para recrear las cuentas, primero elimínalas manualmente.');
        console.log('   O usa la opción --force para eliminar y recrear.');
        if (!process.argv.includes('--force')) {
            console.log('\n💡 Ejecuta con --force para eliminar y recrear las cuentas.');
            return;
        }
        console.log('\n🗑️  Eliminando cuentas existentes (--force)...');
        await prisma.journalEntryLine.deleteMany({});
        await prisma.invoiceLine.deleteMany({});
        await prisma.account.deleteMany({});
        console.log('✅ Cuentas eliminadas');
    }
    // Obtener el primer usuario para createdById
    const user = await prisma.userAccount.findFirst();
    if (!user) {
        throw new Error('No hay usuarios en la base de datos. Ejecuta el seed principal primero.');
    }
    // Obtener moneda por defecto
    const currency = await prisma.currency.findFirst({ where: { isActive: true } });
    console.log('\n📝 Creando cuentas padre/agrupación...');
    // Mapa para guardar los IDs creados
    const codeToId = new Map();
    // Crear cuentas en orden (padres primero)
    for (const acc of accounts) {
        const parentId = acc.parentCode ? codeToId.get(acc.parentCode) : null;
        try {
            const created = await prisma.account.create({
                data: {
                    code: acc.code,
                    accountNumber: acc.code,
                    name: acc.name,
                    type: acc.type,
                    detailType: acc.detailType,
                    isDetail: acc.isDetail,
                    parentAccountId: parentId,
                    currencyId: acc.isDetail && currency ? currency.id : null,
                    currency: acc.isDetail ? 'NIO' : null,
                    isActive: true,
                    createdById: user.id,
                },
            });
            codeToId.set(acc.code, created.id);
            const indent = '  '.repeat(acc.code.split('-').filter(s => parseInt(s) > 0).length);
            console.log(`${indent}✓ ${acc.code} - ${acc.name}`);
        }
        catch (error) {
            if (error.code === 'P2002') {
                console.log(`  ⏭️  ${acc.code} ya existe, omitiendo...`);
                const existing = await prisma.account.findUnique({ where: { code: acc.code } });
                if (existing) {
                    codeToId.set(acc.code, existing.id);
                }
            }
            else {
                throw error;
            }
        }
    }
    console.log(`\n✅ ${codeToId.size} cuentas creadas/verificadas exitosamente`);
    // Verificar jerarquía
    const withParent = await prisma.account.count({ where: { parentAccountId: { not: null } } });
    const withoutParent = await prisma.account.count({ where: { parentAccountId: null } });
    const totalAccounts = await prisma.account.count();
    console.log(`\n📊 Resumen:`);
    console.log(`   - Total de cuentas: ${totalAccounts}`);
    console.log(`   - Cuentas raíz: ${withoutParent}`);
    console.log(`   - Cuentas con padre: ${withParent}`);
    console.log(`\n💡 Ahora puedes importar las cuentas de detalle desde el Excel.`);
}
main()
    .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
