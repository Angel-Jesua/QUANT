---
trigger: always_on
---

# Technology Stack and Development Setup

This document outlines the technologies, dependencies, and setup procedures for the QUANT accounting system.

## Backend

The backend is a Node.js application built with TypeScript.

*   **Framework:** Express.js
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** JWT with session persistence
*   **Security:** bcryptjs for password hashing, account lockout mechanisms
*   **Testing:** Jest with Supertest for integration testing
*   **Dependencies:**
    *   `express`: Web server framework.
    *   `cors`: Middleware for handling Cross-Origin Resource Sharing.
    *   `dotenv`: For managing environment variables.
    *   `@prisma/client`: Prisma's database client.
    *   `bcryptjs`: Password hashing and verification.
    *   `jsonwebtoken`: JWT token generation and verification.
*   **Dev Dependencies:**
    *   `typescript`: For compiling TypeScript.
    *   `ts-node`: For running TypeScript directly.
    *   `nodemon`: For automatically restarting the server on file changes.
    *   `prisma`: Prisma's command-line tool.
    *   `jest`: Testing framework.
    *   `@types/jest`: TypeScript definitions for Jest.
    *   `ts-jest`: TypeScript preprocessor for Jest.
    *   `supertest`: HTTP assertion testing.
    *   `@types/supertest`: TypeScript definitions for Supertest.

### Environment Variables

Required environment variables for backend:

```bash
PORT=3000  # Default if unset, server uses process.env.PORT || 3000 [server.ts](backend/src/server.ts:12)
DATABASE_URL="postgresql://username:password@localhost:5432/quant_db"
JWT_SECRET="your-strong-secret-key-at-least-32-characters"
JWT_EXPIRES_IN="1h"
JWT_ISSUER="quant-accounting-system"  # Optional
JWT_AUDIENCE="quant-users"  # Optional
# CORS origin is currently hardcoded to http://localhost:4200 in code [server.ts](backend/src/server.ts:17)
# Optionally define CORS_ALLOWED_ORIGIN and wire it in server configuration if needed
```

### Setup and Running

1. Navigate to the backend directory.
2. Install dependencies: npm install
3. Create .env with required environment variables.
4. Run database migrations: npm run migrate [package.json](backend/package.json:10)
5. Optional seed: npm run seed [package.json](backend/package.json:11)
6. Start dev server: npm run dev [package.json](backend/package.json:7)
7. Build: npm run build then start: npm start [package.json](backend/package.json:8)
8. Run tests: npm test or npm run test:watch [package.json](backend/package.json:12)

### Testing

- Jest configured via [jest.config.js](backend/jest.config.js:1) with ts-jest preset and setupFilesAfterEnv pointing to [test-setup.ts](backend/src/test-setup.ts:1)
- Custom Jest matchers and test env vars are initialized in [test-setup.ts](backend/src/test-setup.ts:6)
- Coverage reports enabled via npm run test:coverage [package.json](backend/package.json:14)
- Integration tests present under backend/src/modules with Supertest as a dependency

### Prisma Migrations

- Prisma schema located at [schema.prisma](backend/prisma/schema.prisma:1)
- Migrations live under backend/prisma/migrations and are applied with npm run migrate [package.json](backend/package.json:10)

### API Endpoints

- Currency endpoints protected with JWT: [`currency.routes.ts`](backend/src/modules/currency/currency.routes.ts:9)
  - POST /api/currencies → create [`router.post`](backend/src/modules/currency/currency.routes.ts:14)
  - GET /api/currencies/:id → getById [`router.get`](backend/src/modules/currency/currency.routes.ts:13)
  - GET /api/currencies → getAll [`router.get`](backend/src/modules/currency/currency.routes.ts:12)
  - PUT /api/currencies/:id → update [`router.put`](backend/src/modules/currency/currency.routes.ts:15)
  - DELETE /api/currencies/:id → delete [`router.delete`](backend/src/modules/currency/currency.routes.ts:16)
- Mounted in server under base path: [`server.ts`](backend/src/server.ts:30)

## Frontend

The frontend is a single-page application built with Angular.

*   **Framework:** Angular
*   **Language:** TypeScript
*   **Dependencies:**
    *   `@angular/core`: Core Angular framework.
    *   `@angular/common`: Common Angular functionalities.
    *   `@angular/router`: For routing.
    *   `rxjs`: For reactive programming.
*   **Dev Dependencies:**
    *   `@angular/cli`: Angular's command-line interface.
    *   `typescript`: For compiling TypeScript.

### Setup and Running

1. Navigate to the frontend directory.
2. Install dependencies: npm install
3. Start the development server: npm start [package.json](frontend/package.json:6)
4. Application runs at http://localhost:4200
5. Build for production: npm run build [package.json](frontend/package.json:7)

Dependencies of note:
- Angular 20.x, RxJS 7.8, TypeScript 5.9 [package.json](frontend/package.json:25)
- Forms and animations are included as dependencies; ngx-captcha is available for CAPTCHA workflows [package.json](frontend/package.json:25)

## Security Features

*   **Password Security:** bcryptjs with salt rounds for secure password hashing
*   **JWT Security:** Strong secret requirements (min 32 chars, mixed complexity)
*   **Account Lockout:** 5 failed attempts trigger 15-minute lockout
*   **Session Management:** JWT tokens stored in database with expiration tracking
*   **Audit Logging:** Comprehensive logging of all authentication attempts and user actions
*   **Credential Uniqueness:** Enforced uniqueness for usernames and emails
*   **Input Validation:** Comprehensive validation for all user inputs