# Documentación de APIs - QUANT Accounting System

## Configuración Base

- **URL Base**: `http://localhost:3000`
- **Autenticación**: JWT Bearer Token
- **Content-Type**: `application/json`

## Autenticación

### 1. Registrar Usuario
```http
POST /api/auth/register
```

**Body:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test123456",
  "confirmPassword": "Test123456",
  "fullName": "Test User",
  "acceptTerms": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 3,
    "username": "testuser",
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "accountant",
    "isActive": true,
    "createdAt": "2025-11-11T00:27:12.484Z",
    "updatedAt": "2025-11-11T00:27:12.484Z",
    "avatarType": "generated"
  }
}
```

### 2. Iniciar Sesión
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "test@example.com",
  "password": "Test123456"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 3,
    "username": "testuser",
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "accountant",
    "avatarType": "generated",
    "profileImageUrl": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h",
  "message": "Inicio de sesión exitoso"
}
```

## APIs de Currencies

### 1. Obtener Todas las Monedas
```http
GET /api/currencies
Authorization: Bearer {token}
```

**Query Parameters (opcionales):**
- `page`: Número de página (default: 1)
- `limit`: Límite de resultados (default: 20, max: 100)
- `search`: Búsqueda por código o nombre
- `isActive`: Filtrar por estado activo (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "decimalPlaces": 2,
      "isBaseCurrency": true,
      "exchangeRate": "1",
      "isActive": true,
      "createdAt": "2025-11-01T02:51:44.138Z",
      "updatedAt": "2025-11-01T02:51:44.138Z",
      "createdById": 1
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 2. Obtener Moneda por ID
```http
GET /api/currencies/{id}
Authorization: Bearer {token}
```

### 3. Crear Moneda
```http
POST /api/currencies
Authorization: Bearer {token}
```

**Body:**
```json
{
  "code": "EUR",
  "name": "Euro",
  "symbol": "€",
  "exchangeRate": 1.09,
  "decimalPlaces": 2,
  "isBaseCurrency": false,
  "isActive": true
}
```

**Campos requeridos:**
- `code`: String (3 caracteres, ISO code)
- `name`: String
- `symbol`: String
- `exchangeRate`: Number (> 0)

**Campos opcionales:**
- `decimalPlaces`: Number (default: 2)
- `isBaseCurrency`: Boolean (default: false)
- `isActive`: Boolean (default: true)

### 4. Actualizar Moneda
```http
PUT /api/currencies/{id}
Authorization: Bearer {token}
```

**Body (parcial):**
```json
{
  "exchangeRate": 1.10,
  "isActive": false
}
```

### 5. Eliminar Moneda
```http
DELETE /api/currencies/{id}
Authorization: Bearer {token}
```

## APIs de Clients

### 1. Obtener Todos los Clientes
```http
GET /api/clients
Authorization: Bearer {token}
```

**Query Parameters (opcionales):**
- `page`: Número de página (default: 1)
- `pageSize` o `limit`: Límite de resultados (default: 20, max: 100)
- `search`: Búsqueda por clientCode, name o taxId
- `isActive`: Filtrar por estado activo (true/false)
- `currencyId`: Filtrar por ID de moneda
- `countryCode`: Filtrar por código de país (ISO 3166-1 alfa-2)
- `stateCode`: Filtrar por código de estado/departamento

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "clientCode": "CLI001",
      "taxId": "J123456789",
      "name": "Cliente de Prueba",
      "contactName": "Juan Pérez",
      "email": "juan@cliente.com",
      "phone": "+50588887777",
      "address": "Dirección de prueba",
      "city": "Managua",
      "country": "NI",
      "postalCode": "11001",
      "creditLimit": "5000",
      "currencyId": 1,
      "isActive": true,
      "createdAt": "2025-11-11T00:34:23.588Z",
      "updatedAt": "2025-11-11T00:34:23.588Z",
      "createdById": 3
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 2. Obtener Cliente por ID
```http
GET /api/clients/{id}
Authorization: Bearer {token}
```

### 3. Crear Cliente
```http
POST /api/clients
Authorization: Bearer {token}
```

**Body:**
```json
{
  "clientCode": "CLI002",
  "name": "Nuevo Cliente",
  "currencyId": 1,
  "taxId": "J987654321",
  "contactName": "María González",
  "email": "maria@nuevocliente.com",
  "phone": "+50577776666",
  "address": "Nueva dirección",
  "city": "León",
  "country": "NI",
  "postalCode": "21000",
  "creditLimit": 10000,
  "isActive": true
}
```

**Campos requeridos:**
- `clientCode`: String (1-20 caracteres)
- `name`: String (no vacío)
- `currencyId`: Number (entero positivo)

**Campos opcionales:**
- `taxId`: String (1-32 caracteres)
- `contactName`: String
- `email`: Email válido
- `phone`: String (formato E.164: +50588887777)
- `address`: String
- `city`: String
- `country`: String (ISO 3166-1 alfa-2, 2 letras mayúsculas)
- `postalCode`: String (1-16 caracteres)
- `creditLimit`: Number (>= 0) o string numérico
- `isActive`: Boolean

### 4. Actualizar Cliente
```http
PUT /api/clients/{id}
Authorization: Bearer {token}
```

**Body (parcial):**
```json
{
  "name": "Cliente Actualizado",
  "creditLimit": 7500,
  "isActive": false
}
```

### 5. Eliminar Cliente (Soft Delete)
```http
DELETE /api/clients/{id}
Authorization: Bearer {token}
```

## APIs de Accounts

### 1. Obtener Todas las Cuentas
```http
GET /api/accounts
Authorization: Bearer {token}
```

**Query Parameters (opcionales):**
- `page`: Número de página (default: 1)
- `pageSize` o `limit`: Límite de resultados (default: 20, max: 100)
- `search`: Búsqueda por accountNumber o name
- `isActive`: Filtrar por estado activo (true/false)
- `type`: Filtrar por tipo de cuenta
- `currencyId`: Filtrar por ID de moneda
- `parentAccountId`: Filtrar por cuenta padre
- `isDetail`: Filtrar por cuentas de detalle (true/false)

**Tipos de cuenta válidos:**
- `Activo`
- `Pasivo`
- `Capital`
- `Costos`
- `Ingresos`
- `Gastos`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "accountNumber": "1000",
      "name": "Activo",
      "type": "Activo",
      "currencyId": 1,
      "isDetail": false,
      "isActive": true,
      "createdAt": "2025-11-01T02:51:44.230Z",
      "updatedAt": "2025-11-01T02:51:44.230Z",
      "createdById": 1
    },
    {
      "id": 2,
      "accountNumber": "1100",
      "name": "Caja y Bancos",
      "type": "Activo",
      "currencyId": 1,
      "parentAccountId": 1,
      "isDetail": false,
      "isActive": true,
      "createdAt": "2025-11-01T02:51:44.260Z",
      "updatedAt": "2025-11-01T02:51:44.260Z",
      "createdById": 1
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

### 2. Obtener Cuenta por ID
```http
GET /api/accounts/{id}
Authorization: Bearer {token}
```

### 3. Crear Cuenta
```http
POST /api/accounts
Authorization: Bearer {token}
```

**Body:**
```json
{
  "accountNumber": "5103",
  "name": "Servicios Públicos",
  "type": "Gastos",
  "currencyId": 1,
  "parentAccountId": 9,
  "description": "Cuenta para servicios públicos de oficina",
  "isDetail": true,
  "isActive": true
}
```

**Campos requeridos:**
- `accountNumber`: String (1-20 caracteres)
- `name`: String (no vacío)
- `type`: String (uno de los tipos válidos)
- `currencyId`: Number (entero positivo)

**Campos opcionales:**
- `description`: String
- `parentAccountId`: Number (entero positivo)
- `isDetail`: Boolean
- `isActive`: Boolean

### 4. Actualizar Cuenta
```http
PUT /api/accounts/{id}
Authorization: Bearer {token}
```

**Body (parcial):**
```json
{
  "name": "Servicios Públicos y Mantenimiento",
  "description": "Cuenta actualizada para servicios públicos",
  "isActive": false
}
```

### 5. Eliminar Cuenta (Soft Delete)
```http
DELETE /api/accounts/{id}
Authorization: Bearer {token}
```

## Ejemplos de Uso en Postman

### 1. Configurar Autenticación
1. Crea una nueva request en Postman
2. Ve a la tab "Authorization"
3. Selecciona "Bearer Token" en Type
4. Pega el token obtenido del login

### 2. Crear Moneda
- **Method**: POST
- **URL**: `http://localhost:3000/api/currencies`
- **Headers**: 
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer {tu_token}`
- **Body** (raw, JSON):
```json
{
  "code": "GBP",
  "name": "British Pound",
  "symbol": "£",
  "exchangeRate": 1.27,
  "decimalPlaces": 2,
  "isBaseCurrency": false,
  "isActive": true
}
```

### 3. Filtrar Clientes
- **Method**: GET
- **URL**: `http://localhost:3000/api/clients?search=CLI&isActive=true&countryCode=NI`
- **Headers**: 
  - `Authorization`: `Bearer {tu_token}`

### 4. Crear Jerarquía de Cuentas
Primero crear cuenta padre:
```json
{
  "accountNumber": "5200",
  "name": "Gastos Financieros",
  "type": "Gastos",
  "currencyId": 1,
  "isDetail": false,
  "isActive": true
}
```

Luego crear cuenta hija:
```json
{
  "accountNumber": "5201",
  "name": "Intereses Bancarios",
  "type": "Gastos",
  "currencyId": 1,
  "parentAccountId": {id_del_padre},
  "isDetail": true,
  "isActive": true
}
```

## Notas Importantes

1. **Autenticación**: Todas las APIs (excepto auth) requieren token JWT válido
2. **Propietario**: Los clientes solo pueden ver/crear/actualizar/eliminar sus propios registros
3. **Validación**: Todos los endpoints validan los datos de entrada
4. **Errores**: Los errores devuelven formato consistente con `success: false`
5. **Paginación**: Los endpoints de listado soportan paginación
6. **Soft Delete**: Clientes y Accounts usan soft delete (marcado como inactivo)
7. **Formatos Especiales**:
   - Teléfonos: E.164 (+50588887777)
   - Países: ISO 3166-1 alfa-2 (NI, US, etc.)
   - Códigos de moneda: 3 caracteres (USD, EUR, etc.)

## Token de Prueba

Para pruebas rápidas, puedes usar este token (expira en 1 hora):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsInJvbGUiOiJhY2NvdW50YW50IiwiaWF0IjoxNzYyODIwODYzLCJleHAiOjE3NjI4MjQ0NjN9.NPVGCeZFJicVUhNmEMSM-w6bEkkqLxNjc_SbmIC9O0Q