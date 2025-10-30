import { PrismaClient, UserRole, AvatarType } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
    update: {},
    create: {
      username: 'admin',
      email: 'admin@quant.com',
      passwordHash: adminPasswordHash,
      fullName: 'Administrator',
      role: UserRole.administrator,
      avatarType: AvatarType.generated,
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
    update: {},
    create: {
      username: 'accountant',
      email: 'accountant@quant.com',
      passwordHash: accountantPasswordHash,
      fullName: 'Accountant User',
      role: UserRole.accountant,
      avatarType: AvatarType.generated,
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