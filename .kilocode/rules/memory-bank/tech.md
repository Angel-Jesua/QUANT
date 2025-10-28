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
DATABASE_URL="postgresql://username:password@localhost:5432/quant_db"
JWT_SECRET="your-strong-secret-key-at-least-32-characters"
JWT_EXPIRES_IN="1h"
JWT_ISSUER="quant-accounting-system"  # Optional
JWT_AUDIENCE="quant-users"  # Optional
```

### Setup and-Running

1.  Navigate to the `backend` directory.
2.  Install dependencies: `npm install`
3.  Set up the `.env` file with the required environment variables.
4.  Run database migrations: `npx prisma migrate dev`
5.  (Optional) Seed the database: `npx prisma db seed`
6.  Start the development server: `npm run dev`
7.  Run tests: `npm test`

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

### Setup and-Running

1.  Navigate to the `frontend` directory.
2.  Install dependencies: `npm install`
3.  Start the development server: `npm start`
4.  The application will be available at `http://localhost:4200`.

## Security Features

*   **Password Security:** bcryptjs with salt rounds for secure password hashing
*   **JWT Security:** Strong secret requirements (min 32 chars, mixed complexity)
*   **Account Lockout:** 5 failed attempts trigger 15-minute lockout
*   **Session Management:** JWT tokens stored in database with expiration tracking
*   **Audit Logging:** Comprehensive logging of all authentication attempts and user actions
*   **Credential Uniqueness:** Enforced uniqueness for usernames and emails
*   **Input Validation:** Comprehensive validation for all user inputs