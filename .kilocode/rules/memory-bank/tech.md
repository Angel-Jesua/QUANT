# Technology Stack and Development Setup

This document outlines the technologies, dependencies, and setup procedures for the QUANT accounting system.

## Backend

The backend is a Node.js application built with TypeScript.

*   **Framework:** Express.js
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Dependencies:**
    *   `express`: Web server framework.
    *   `cors`: Middleware for handling Cross-Origin Resource Sharing.
    *   `dotenv`: For managing environment variables.
    *   `@prisma/client`: Prisma's database client.
*   **Dev Dependencies:**
    *   `typescript`: For compiling TypeScript.
    *   `ts-node`: For running TypeScript directly.
    *   `nodemon`: For automatically restarting the server on file changes.
    *   `prisma`: Prisma's command-line tool.

### Setup and-Running

1.  Navigate to the `backend` directory.
2.  Install dependencies: `npm install`
3.  Set up the `.env` file with the `DATABASE_URL`.
4.  Run database migrations: `npx prisma migrate dev`
5.  (Optional) Seed the database: `npx prisma db seed`
6.  Start the development server: `npm run dev`

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