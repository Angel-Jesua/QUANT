---
trigger: always_on
---

# Project Context

## Current Focus

Frontend AuthService provides login, token persistence, and logout against backend API running on port 3000. Auth routes are wired to the UserController on the server. Currency endpoints are implemented and mounted under /api/currencies with JWT protection; next, integrate frontend currency management. Align API documentation with actual base URL and plan password recovery and reset flows.

- Backend server listens on port 3000 with CORS for Angular dev origin [server.ts](backend/src/server.ts:12), [server.ts](backend/src/server.ts:16)
- Auth endpoints mapped to controller methods [auth.routes.ts](backend/src/modules/auth/auth.routes.ts:7)
- Frontend AuthService implements [`login(credentials)`](frontend/src/app/auth/auth.service.ts:52), [`isAuthenticated()`](frontend/src/app/auth/auth.service.ts:93), [`getToken()`](frontend/src/app/auth/auth.service.ts:97), and [`logout()`](frontend/src/app/auth/auth.service.ts:111)

## Recent Changes

- Backend
  - Express app initialized with JSON and CORS middleware; CORS origin set to http://localhost:4200 [server.ts](backend/src/server.ts:17)
  - API routes mounted: `/api/users`, `/api/auth`, y `/api/currencies` [server.ts](backend/src/server.ts:30)
  - `/api/auth/login` y `/api/auth/register` delegan a UserController [auth.routes.ts](backend/src/modules/auth/auth.routes.ts:7)
  - Global error handler centralizes audit-safe responses using utilities and Prisma AuditAction [server.ts](backend/src/server.ts:44), [error.ts](backend/src/utils/error.ts:1)
  - Currency module implementado: controlador, servicio, tipos y rutas protegidas con JWT; enrutador montado en `/api/currencies` [currency.routes.ts](backend/src/modules/currency/currency.routes.ts:9), [server.ts](backend/src/server.ts:30), [currency.controller.ts](backend/src/modules/currency/currency.controller.ts)
  - Database schema includes core auth models plus accounting domain models and enums:
    - Enums: [`AccountType`](backend/prisma/schema.prisma:41), [`AuditAction`](backend/prisma/schema.prisma:28)
    - Models: [`Currency`](backend/prisma/schema.prisma:178), [`Client`](backend/prisma/schema.prisma:208), [`Account`](backend/prisma/schema.prisma:246), [`UserSession`](backend/prisma/schema.prisma:112), [`UserAuditLog`](backend/prisma/schema.prisma:153)
  - Security utilities present for JWT and password hashing [jwt.ts](backend/src/utils/jwt.ts:1), [password.ts](backend/src/utils/password.ts:1)

- Frontend
  - AuthService base URL set to `http://localhost:3000/api` [auth.service.ts](frontend/src/app/auth/auth.service.ts:43)
  - Login flow persists JWT to localStorage under `quant_auth_token` and updates a BehaviorSubject [auth.service.ts](frontend/src/app/auth/auth.service.ts:63)
  - Error handling categorizes common HTTP statuses into user-friendly messages [auth.service.ts](frontend/src/app/auth/auth.service.ts:70)
  - No current implementations for recoverPassword or resetPassword in AuthService; these are planned pending backend endpoints

- Documentation
  - API documentation lists dev base URL as `http://localhost:3001` which does not match the actual server port 3000 [api.md](backend/api.md:4)

## Next Steps

1. Integrate AuthService into existing login component and route
   - Wire component submission to [`AuthService.login`](frontend/src/app/auth/auth.service.ts:52) and handle success/error UI
2. Integrate frontend Currency management (listar/crear/editar/eliminar)
   - Consumir `/api/currencies` (GET/POST/PUT/DELETE) y conectar con UI [currency.routes.ts](backend/src/modules/currency/currency.routes.ts)
3. Specify and implement backend password recovery and reset endpoints
   - Define routes under `/api/auth` for `recover` and `reset` and implement in controller and service with audit logging
4. Extend AuthService with recover and reset methods once backend is ready
   - Add `recoverPassword(email)` and `resetPassword(token, newPassword)` and update UI components accordingly
5. Align API documentation with reality
   - Update dev Base URL to 3000 and list the actual `/api/auth`, `/api/users`, y `/api/currencies` endpoints [api.md](backend/api.md:4)
6. Optional registration flow decision
   - Confirm whether `/api/auth/register` is exposed to end users or restricted to admin-only provisioning; update frontend accordingly

## Technical Achievements

- Centralized error handling with audit-safe responses in Express global error handler [server.ts](backend/src/server.ts:44)
- JWT and password utilities scaffolded for secure auth flows [jwt.ts](backend/src/utils/jwt.ts:1), [password.ts](backend/src/utils/password.ts:1)
- Prisma schema models and indexes established for authentication, auditing, and accounting domains [schema.prisma](backend/prisma/schema.prisma:1)
- Frontend AuthService with BehaviorSubject-based token state, localStorage persistence, and categorized HTTP error handling [auth.service.ts](frontend/src/app/auth/auth.service.ts:43)
- Currency module and routes implemented with controller-level validation, consistent response schema, audit logging, and JWT protection; router mounted under `/api/currencies` [currency.routes.ts](backend/src/modules/currency/currency.routes.ts:9), [server.ts](backend/src/server.ts:30), [currency.controller.ts](backend/src/modules/currency/currency.controller.ts)

## Notes

- There is a base URL mismatch between server port 3000 and API docs referencing 3001 that should be corrected [api.md](backend/api.md:4)
- CORS allows Angular dev origin at http://localhost:4200 enabling local integration [server.ts](backend/src/server.ts:17)
- Currency endpoints are available at `/api/currencies` [server.ts](backend/src/server.ts:30)