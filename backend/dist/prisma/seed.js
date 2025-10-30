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
        update: {},
        create: {
            username: 'admin',
            email: 'admin@quant.com',
            passwordHash: adminPasswordHash,
            fullName: 'Administrator',
            role: client_1.UserRole.administrator,
            avatarType: client_1.AvatarType.generated,
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
        update: {},
        create: {
            username: 'accountant',
            email: 'accountant@quant.com',
            passwordHash: accountantPasswordHash,
            fullName: 'Accountant User',
            role: client_1.UserRole.accountant,
            avatarType: client_1.AvatarType.generated,
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
