# Prisma Schema for QUANT Accounting System

This directory contains the Prisma schema and migration files for the QUANT accounting system's user authentication and management module.

## Files Overview

- `schema.prisma`: The main Prisma schema file defining all models, enums, and relationships
- `migrations/001_init_user_auth_system.sql`: SQL migration script to initialize the database

## Database Models

### Enums

1. `UserRole`: Defines user roles (administrator, accountant)
2. `AvatarType`: Types of avatars (generated, uploaded, social, gravatar)
3. `AuditAction`: Actions for audit logging (create, update, delete, login, logout, etc.)

### Models

1. **UserAccount**: Main user table with authentication, profile, and security fields
2. **UserSession**: User session management
3. **RolePermission**: Permission system based on user roles
4. **UserAuditLog**: Comprehensive audit logging for all user actions

## Setup Instructions

### 1. Configure Database Connection

Update the `.env` file in the backend root directory with your PostgreSQL connection details:

```
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
```

### 2. Apply Database Schema

Option A: Using Prisma Migrate (Recommended)

```bash
cd backend
npx prisma migrate dev --name init_user_auth_system
```

Option B: Manual SQL Execution

If you prefer to apply the schema manually:

1. Connect to your PostgreSQL database
2. Execute the SQL script: `prisma/migrations/001_init_user_auth_system.sql`

### 3. Generate Prisma Client

After applying the schema, generate the Prisma Client:

```bash
cd backend
npx prisma generate
```

## Key Features

### Hybrid Avatar System

The system supports multiple avatar types:
- `generated`: Auto-generated avatars
- `uploaded`: User-uploaded images
- `social`: From social media accounts
- `gravatar`: Gravatar integration

### Security Features

- Failed login attempt tracking
- Account lockout mechanism
- Password change requirements
- Session management with expiration
- Comprehensive audit logging

### Self-Referencing Relationships

The UserAccount model includes self-referencing relationships for tracking who created and last updated each record.

## Indexes

The schema includes optimized indexes for:
- Fast user lookups by username, email, and role
- Session management
- Audit log queries
- Avatar system performance

## Notes

1. The `failedLoginAttempts` field includes a CHECK constraint at the database level (failed_login_attempts >= 0)
2. The `updatedAt` field is automatically updated via a database trigger
3. Conditional indexes (WHERE clauses) are implemented at the database level for better performance
4. All foreign key relationships include appropriate ON DELETE behaviors

## Next Steps

After setting up the database schema:

1. Implement authentication services in the backend
2. Create the corresponding frontend components
3. Set up role-based access control (RBAC)
4. Implement the avatar system
5. Create audit log viewing interfaces

For more information on using Prisma, see the [official Prisma documentation](https://www.prisma.io/docs/).