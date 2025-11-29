# QUANT - Sistema Contable para Bufete de Abogados

## Descripción del Proyecto
QUANT es un sistema contable integral desarrollado para el bufete de abogados **IURIS CONSULTUS Nicaragua S.A**. El objetivo es optimizar y modernizar las gestiones contables del bufete.

## Stack Tecnológico

### Backend
- **Runtime**: Node.js con TypeScript
- **Framework**: Express.js
- **ORM**: Prisma con PostgreSQL
- **Autenticación**: JWT (JSON Web Tokens)
- **Testing**: Jest + Supertest
- **Puerto por defecto**: 3000

### Frontend
- **Framework**: Angular 20.x (standalone components)
- **Estilos**: SCSS
- **Testing**: Karma + Jasmine
- **Puerto por defecto**: 4200

## Estructura del Proyecto

```
QUANT/
├── backend/
│   ├── src/
│   │   ├── modules/          # Módulos de la API
│   │   │   ├── account/      # Cuentas contables
│   │   │   ├── auth/         # Autenticación
│   │   │   ├── client/       # Clientes
│   │   │   ├── currency/     # Monedas
│   │   │   ├── journal/      # Asientos contables
│   │   │   ├── report/       # Reportes financieros
│   │   │   └── user/         # Usuarios
│   │   ├── middleware/       # Middlewares (auth, etc.)
│   │   ├── utils/            # Utilidades
│   │   └── server.ts         # Punto de entrada
│   └── prisma/
│       └── schema.prisma     # Esquema de base de datos
├── frontend/
│   └── src/app/
│       ├── accounts/         # Módulo de cuentas
│       ├── auth/             # Autenticación (login, recovery)
│       ├── clientes/         # Gestión de clientes
│       ├── dashboard/        # Panel principal
│       ├── journal/          # Asientos contables
│       ├── reportes/         # Reportes financieros
│       ├── usuarios/         # Gestión de usuarios
│       ├── guards/           # Guards de rutas
│       ├── services/         # Servicios HTTP
│       └── shared/           # Componentes compartidos
└── API_DOCUMENTATION.md      # Documentación de APIs
```

## Modelos de Datos Principales

### Usuarios (UserAccount)
- Roles: `administrator`, `accountant`
- Tipos de avatar: `generated`, `uploaded`, `social`, `gravatar`
- Soporte para login social (Google, Facebook)
- Sistema de bloqueo por intentos fallidos

### Monedas (Currency)
- Código ISO de 3 caracteres
- Soporte para moneda base y tasas de cambio
- Decimales configurables

### Clientes (Client)
- Código de cliente único
- Límite de crédito
- Asociación con moneda preferida

### Cuentas Contables (Account)
- Tipos: `Activo`, `Pasivo`, `Capital`, `Costos`, `Ingresos`, `Gastos`
- Estructura jerárquica (cuentas padre/hijo)
- Cuentas de detalle vs. cuentas de resumen

### Asientos Contables (JournalEntry)
- Líneas de débito y crédito
- Soporte para reversiones
- Estados: borrador, contabilizado

### Facturas (Invoice)
- Estados: `draft`, `pending`, `paid`, `cancelled`
- Tipos de línea: `main_service`, `extra_service`, `expense`
- Cálculo automático de impuestos (IVA 15%)

### Pagos (Payment)
- Métodos: `cash`, `check`, `bank_transfer`, `credit_card`, `other`
- Asignación a múltiples facturas

## Comandos Útiles

### Backend
```bash
cd backend
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm run start        # Producción
npm run migrate      # Ejecutar migraciones Prisma
npm run seed         # Poblar base de datos
npm test             # Ejecutar tests
```

### Frontend
```bash
cd frontend
npm start            # Servidor de desarrollo (ng serve)
npm run build        # Build de producción
npm test             # Ejecutar tests
```

## APIs Principales

Base URL: `http://localhost:3000/api`

| Módulo | Endpoint | Descripción |
|--------|----------|-------------|
| Auth | `/auth/login`, `/auth/register` | Autenticación |
| Users | `/users` | Gestión de usuarios |
| Currencies | `/currencies` | Monedas |
| Clients | `/clients` | Clientes |
| Accounts | `/accounts` | Plan de cuentas |
| Journal | `/journal` | Asientos contables |
| Reports | `/reports` | Reportes financieros |

## Convenciones de Código

### Backend
- Módulos organizados por dominio (routes, controller, service)
- Validación con esquemas
- Soft delete para clientes y cuentas
- Auditoría de acciones de usuario

### Frontend
- Componentes standalone de Angular
- Servicios para comunicación HTTP
- Guards para protección de rutas
- Interceptors para manejo de tokens

## Configuración de Entorno

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3000
```

### CORS
Orígenes permitidos:
- `http://localhost:4200` (desarrollo)
- `https://quant-app-7hofs.ondigitalocean.app` (producción)

## Despliegue
- Plataforma: DigitalOcean App Platform
- Las rutas API funcionan tanto con prefijo `/api` como sin él

## Contexto de Negocio
- País: Nicaragua
- Moneda base: USD (Dólar estadounidense)
- Impuesto estándar: IVA 15%
- Formato de teléfono: E.164 (+505...)
- Código de país: NI (ISO 3166-1 alfa-2)
