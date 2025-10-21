# Project Context

## Current Focus

Currently implementing the user authentication and management system for the QUANT accounting application. The backend now has a comprehensive database schema with Prisma ORM that supports a complete user management system including authentication, authorization, and audit logging.

## Recent Changes

*   The initial project structure has been scaffolded.
*   The backend has a basic Express server setup.
*   The Prisma schema has been completely redesigned from a basic `User` model to a comprehensive user authentication system with:
    - Complete `UserAccount` model with security features
    - `UserSession` model for session management
    - `RolePermission` model for role-based access control
    - `UserAuditLog` model for comprehensive audit tracking
    - Support for hybrid avatar system (generated, uploaded, social, gravatar)
    - OAuth fields for future integration
*   Created SQL migration script for database initialization.
*   Added comprehensive documentation for the database schema.

## Next Steps

The next steps will involve:
1. Implementing the authentication services in the backend
2. Creating API endpoints for user management
3. Building the frontend authentication components
4. Implementing role-based access control (RBAC)
5. Setting up the avatar system functionality
6. Creating audit log viewing interfaces