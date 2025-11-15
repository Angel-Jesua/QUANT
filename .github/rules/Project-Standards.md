# Project-Standards.md

**Project Context**
This document defines the technical and architectural standards for the **QUANT Accounting System** developed for **IURUS CONSULTUS Nicaragua S.A.**
It ensures **consistency, scalability, maintainability, and audit reliability** across all codebases built in **Angular 20 + TypeScript + Node.js + PostgreSQL**.

---

## 1. TypeScript and Code Structure Rules

- **File Length:** Recommended 100 – 250 lines, Max 400 lines (Notes: Split logic into multiple files)
- **Class:** Recommended ≤ 300 lines, Max 400 lines (Notes: Extract helpers/services if exceeded)
- **Function/Method:** Recommended 5 – 25 lines, Max 40 lines (Notes: Must do one clear action)
- **Interface/Type Alias:** Recommended ≤ 20 props, Max 30 props (Notes: Break into composables)
- **Cyclomatic Complexity:** Recommended ≤ 10, Max 15 (Notes: Simplify via early returns)
- **Nesting Depth:** Recommended ≤ 3, Max 4 (Notes: Refactor using guard clauses)
- **Comment Density:** Recommended 1 comment / 20–30 lines (Notes: Explain intent, not syntax)

### 1.1 Coding Conventions
- Use **strict TypeScript mode**; `any` is prohibited.
- Prefer **interfaces** for data models; prefix with `I` only if shared cross-layer.
- Follow **kebab-case** file names (`account-entry.service.ts`).
- Use **PascalCase** for classes, **camelCase** for variables/functions, **UPPER_SNAKE_CASE** for constants.
- Import order: Angular → Third Party → Internal.
- Prefer **functional programming** patterns; avoid unnecessary classes.
- Use **early returns** and **guard clauses** to reduce nesting.
- Prefer **RORO (Receive an Object, Return an Object)** pattern for complex functions.
- Use **descriptive variable names** with auxiliary verbs (`isLoading`, `hasPermission`).
- Avoid unnecessary curly braces in single-line conditionals.

---

## 2. Angular Guidelines

### 2.1 Components
- **Size:** 100–200 lines (TS), max 300.
- **Focus:** UI logic only — no business logic.
- **Change Detection:** `OnPush` by default.
- **Signals:** Use Angular Signals for reactive state.
- **Template Size:** ≤ 250 lines HTML; split into child components if larger.
- Use **functional, declarative templates** — avoid imperative DOM manipulation.
- Place static content and interfaces at the end of the file.

### 2.2 Services
- **Single Domain Responsibility.**
- **Size:** 100–250 lines, max 350.
- **Error Handling:** Always throw typed errors; log via `LoggerService`.
- Avoid direct DOM access; prefer Angular abstractions.
- Handle all edge cases early; avoid deeply nested logic.
- Return clear, typed results — prefer discriminated unions or result objects instead of throwing for expected errors.

### 2.3 Modules and Routing
- Prefer **standalone components**.
- Use **lazy loading** for feature routes.
- Keep routing modules clean (≤ 100 lines).
- Maintain clear **domain folder separation**:
  `app/features`, `app/shared`, `app/core`.

---

## 3. Node.js Backend Standards

### 3.1 Code Conventions
- Use **functional services and repositories** — avoid classes when unnecessary.
- Enforce **TypeScript strict mode** and avoid `any`.
- Prefer **named exports** for all modules.
- Organize files by **feature/domain**, not by layer when possible.
- Use **Zod** for validation of all inputs and responses.
- Apply **consistent error handling** using custom error factories or `AppError`.

---

## 4. Security and Compliance Rules

- Use **JWT** via HTTP Interceptor; refresh on expiry.
- Backend must verify JWT + role on every protected endpoint.
- Hash all passwords with **bcrypt** (≥ 10 rounds).
- Sanitize and validate all inputs via **zod**.
- Apply **helmet**, **cors**, and **rate-limiting** middleware.
- All financial and user data transmission via **HTTPS TLS 1.2+**.
- Precision: use **DECIMAL(18, 2)** for currency; never float/double.
- Conversions and rounding must follow **ISO 4217** or **DGI** rules.
- Use **centralized logging** for all security events.

---

## 5. Performance Standards

- **App Load Time (SPA):** Target ≤ 4 s
- **API Response Time:** Target ≤ 500 ms (normal load)
- **Report Generation:** Target ≤ 20 s complex, ≤ 15 s simple
- **FPS Drop Tolerance:** Target none > 100 ms frame stall

**Frontend Optimizations**
- Use **lazy loading**, **code splitting**, and **route preloading**.
- Avoid unnecessary change detections.
- Cache frequent data with **signals** or RxJS `shareReplay`.

**Backend Optimizations**
- Use Prisma `select` fields to limit columns.
- Index foreign keys and frequent filters.
- Batch inserts/updates using transactions.
- Use connection pooling and query caching where appropriate.

---

## 6. Testing Standards

- **Coverage:** Requirement ≥ 80 % functions / 70 % branches
- **Test File Size:** Requirement 50 – 150 lines recommended; max 250
- **Structure:** Requirement One `.spec.ts` per component/service
- **Tools:** Requirement Jasmine / Karma (frontend), Jest (backend)
- **Naming:** Requirement `describe('AccountService')` format
- **Mock Strategy:** Requirement Use dependency injection, not spies on private members

---

## 7. Documentation Rules

- Every **public method** requires a `/** @param @return */` JSDoc comment.
- Generate **Compodoc** for Angular and **Swagger** for backend endpoints.
- Maintain an `ADR/` (Architecture Decision Records) folder documenting major design choices.
- Keep `README-architecture.md` up to date with current folder layout.
- Document **API error codes**, expected responses, and validation schemas.

---

## 8. Governance and Quality Control

- Use **ESLint + Prettier** with project-wide config.
- Enforce coding rules via **CI (GitHub Actions)** before merging.
- Integrate **SonarQube** or **CodeQL** for quality gates (≥ A rating).
- All deviations from this document require an **ADR exception record**.
- Maintain `scripts/validate-standards.sh` to automatically check file length, complexity, and naming compliance.