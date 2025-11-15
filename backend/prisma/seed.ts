import { PrismaClient, Prisma, UserRole, AvatarType, AccountType } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PROFILE_IMAGE_FOLDER = 'images';
const DEFAULT_PROFILE_IMAGE = `${PROFILE_IMAGE_FOLDER}/default-avatar.svg`;
const ACCOUNTANT_PROFILE_IMAGE = `${PROFILE_IMAGE_FOLDER}/woman.png`;

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash passwords with bcrypt (same as the application does)
  const adminPassword = 'Admin123!'
  const accountantPassword = 'Account123!'
  
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10)
  const accountantPasswordHash = await bcrypt.hash(accountantPassword, 10)

  // Create administrator user
  const admin = await prisma.userAccount.upsert({
    where: { email: 'admin@quant.com' },
    update: {
      profileImageUrl: DEFAULT_PROFILE_IMAGE,
      avatarType: AvatarType.generated,
    },
    create: {
      username: 'admin',
      email: 'admin@quant.com',
      passwordHash: adminPasswordHash,
      fullName: 'Administrator',
      role: UserRole.administrator,
      avatarType: AvatarType.generated,
       profileImageUrl: DEFAULT_PROFILE_IMAGE,
      photoRequested: true,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  })
  console.log('✅ Administrator created:', { 
    id: admin.id, 
    username: admin.username, 
    email: admin.email,
    password: adminPassword 
  })

  // Create accountant user
  const accountant = await prisma.userAccount.upsert({
    where: { email: 'accountant@quant.com' },
    update: {
      profileImageUrl: ACCOUNTANT_PROFILE_IMAGE,
      avatarType: AvatarType.uploaded,
    },
    create: {
      username: 'accountant',
      email: 'accountant@quant.com',
      passwordHash: accountantPasswordHash,
      fullName: 'Accountant User',
      role: UserRole.accountant,
      avatarType: AvatarType.uploaded,
      profileImageUrl: ACCOUNTANT_PROFILE_IMAGE,
      photoRequested: true,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  })
  console.log('✅ Accountant created:', { 
    id: accountant.id, 
    username: accountant.username, 
    email: accountant.email,
    password: accountantPassword 
  })

  // Create some role permissions for both roles
  const modules = ['users', 'reports', 'settings', 'audit']
  
  for (const module of modules) {
    // Administrator has full permissions
    await prisma.rolePermission.upsert({
      where: { 
        role_module: { 
          role: UserRole.administrator, 
          module: module 
        } 
      },
      update: {},
      create: {
        role: UserRole.administrator,
        module: module,
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        createdById: admin.id,
      },
    })

    // Accountant has limited permissions
    await prisma.rolePermission.upsert({
      where: { 
        role_module: { 
          role: UserRole.accountant, 
          module: module 
        } 
      },
      update: {},
      create: {
        role: UserRole.accountant,
        module: module,
        canRead: true,
        canCreate: module !== 'settings' && module !== 'users',
        canUpdate: module !== 'settings' && module !== 'users',
        canDelete: false,
        createdById: admin.id,
      },
    })
  }
  console.log('✅ Role permissions created for modules:', modules)

  // Seed base currency USD
  const usd = await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {
      isBaseCurrency: true,
      exchangeRate: new Prisma.Decimal('1.000000'),
      updatedById: admin.id,
    },
    create: {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      decimalPlaces: 2,
      isBaseCurrency: true,
      exchangeRate: new Prisma.Decimal('1.000000'),
      isActive: true,
      createdById: admin.id,
    },
  })
  console.log('✅ Base currency created:', { id: usd.id, code: usd.code, symbol: usd.symbol })

  // Seed example clients
  const clientsData = [
    { clientCode: 'CUST-001', taxId: 'RUC001', name: 'Cliente Alfa', email: 'alfa@example.com', phone: '505-555-0001', address: 'Managua', city: 'Managua' },
    { clientCode: 'CUST-002', taxId: 'RUC002', name: 'Cliente Beta', email: 'beta@example.com', phone: '505-555-0002', address: 'León', city: 'León' },
    { clientCode: 'CUST-003', taxId: 'RUC003', name: 'Cliente Gamma', email: 'gamma@example.com', phone: '505-555-0003', address: 'Granada', city: 'Granada' },
  ]

  const clientResults = []
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
    })
    clientResults.push(client)
  }
  console.log(`✅ Clients upserted: ${clientResults.length}`)

  // Seed chart of accounts
  type AccountSeed = { accountNumber: string; name: string; type: AccountType; parent?: string; isDetail: boolean }
  const accountsSeed: AccountSeed[] = [
    { accountNumber: '1000', name: 'Activo', type: AccountType.Activo, isDetail: false },
    { accountNumber: '1100', name: 'Caja y Bancos', type: AccountType.Activo, parent: '1000', isDetail: false },
    { accountNumber: '1101', name: 'Caja General', type: AccountType.Activo, parent: '1100', isDetail: true },
    { accountNumber: '1200', name: 'Cuentas por Cobrar', type: AccountType.Activo, parent: '1000', isDetail: false },
    { accountNumber: '1201', name: 'Clientes Nacionales', type: AccountType.Activo, parent: '1200', isDetail: true },

    { accountNumber: '4000', name: 'Ingresos', type: AccountType.Ingresos, isDetail: false },
    { accountNumber: '4100', name: 'Ventas', type: AccountType.Ingresos, parent: '4000', isDetail: true },

    { accountNumber: '5000', name: 'Gastos', type: AccountType.Gastos, isDetail: false },
    { accountNumber: '5100', name: 'Gastos Operativos', type: AccountType.Gastos, parent: '5000', isDetail: false },
    { accountNumber: '5101', name: 'Gastos de Oficina', type: AccountType.Gastos, parent: '5100', isDetail: true },
  ]

  const accountIdByNumber = new Map<string, number>()
  let accountsUpserted = 0
  for (const a of accountsSeed) {
    const parentId = a.parent ? accountIdByNumber.get(a.parent) ?? null : null
    const acc = await prisma.account.upsert({
      where: { accountNumber: a.accountNumber },
      update: {
        name: a.name,
        type: a.type,
        isDetail: a.isDetail,
        parentAccountId: parentId,
        currencyId: usd.id,
        isActive: true,
        updatedById: admin.id,
      },
      create: {
        accountNumber: a.accountNumber,
        name: a.name,
        type: a.type,
        currencyId: usd.id,
        parentAccountId: parentId,
        isDetail: a.isDetail,
        isActive: true,
        createdById: admin.id,
      },
    })
    accountIdByNumber.set(a.accountNumber, acc.id)
    accountsUpserted++
  }
  console.log(`✅ Accounts upserted: ${accountsUpserted}`)

  console.log('\n📝 CREDENTIALS FOR LOGIN:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Administrator:')
  console.log('  Email: admin@quant.com')
  console.log('  Password: Admin123!')
  console.log('')
  console.log('Accountant:')
  console.log('  Email: accountant@quant.com')
  console.log('  Password: Account123!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✨ Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })