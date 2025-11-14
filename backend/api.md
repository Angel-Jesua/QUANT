# API Documentation

## Base URL
- Development: `http://localhost:3000/api`  [server.ts](backend/src/server.ts:27)
- Production: `https://api.example.com`

## Endpoints

### Users
- **GET /api/users**
  - Description: Retrieve all users
  - Response: Array of users
  - Notes: Route mounted under `/api/users` [server.ts](backend/src/server.ts:27)
- **POST /api/users**
  - Description: Create a new user
  - Body: `{ "username": "string", "email": "string", "password": "string", "fullName": "string" }`
  - Response: Created user object

### Authentication
- **POST /api/auth/login**
  - Description: User login
  - Body: `{ "email": "string", "password": "string", "rememberMe": "boolean", "recaptchaToken": "string" }`
  - Routed to [`UserController.login`](backend/src/modules/user/user.controller.ts) via [`auth.routes.ts`](backend/src/modules/auth/auth.routes.ts:8)
- **POST /api/auth/register**
  - Description: User registration
  - Body: `{ "email": "string", "password": "string", "username": "string", "fullName": "string" }`
  - Routed to [`UserController.register`](backend/src/modules/user/user.controller.ts) via [`auth.routes.ts`](backend/src/modules/auth/auth.routes.ts:9)

## Error Handling
- Standard HTTP status codes
- Error response format:
  ```
  {
    "error": "Description of error"
  }
  ```
- Global error handler responds with audit-safe errors [server.ts](backend/src/server.ts:41), [`Error Utilities.error.ts`](backend/src/utils/error.ts:1)

## Notes
- All endpoints require authentication except `/api/auth/login` and `/api/auth/register`.
- Use Prisma ORM for database operations with schema in [`schema.prisma`](backend/prisma/schema.prisma:1).
- CORS enabled for `http://localhost:4200` [server.ts](backend/src/server.ts:16).