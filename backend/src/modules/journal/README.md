# Journal Entry API - Partida Doble

## Descripción
Módulo de asientos contables con validación de partida doble. Implementa las reglas fundamentales de la contabilidad donde:
- **Total Debe = Total Haber** (siempre)
- **Total > 0** (no se permiten asientos vacíos)

## Endpoints

### Crear Asiento Contable
```
POST /api/journal
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "entryDate": "2025-11-25",
  "description": "Compra de equipo de oficina",
  "currencyId": 1,
  "exchangeRate": 1.00,
  "voucherNumber": "COMP-001",
  "lines": [
    {
      "accountId": 1,
      "description": "Equipo de oficina",
      "debitAmount": 5000.00,
      "creditAmount": 0
    },
    {
      "accountId": 2,
      "description": "Banco Nacional",
      "debitAmount": 0,
      "creditAmount": 5000.00
    }
  ]
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": 1,
  "entryNumber": "DIARIO-202511-0001",
  "entryDate": "2025-11-25",
  "description": "Compra de equipo de oficina",
  "currencyId": 1,
  "currencyCode": "NIO",
  "exchangeRate": "1.000000",
  "isPosted": false,
  "isReversed": false,
  "totalDebit": "5000.00",
  "totalCredit": "5000.00",
  "lines": [...],
  "createdAt": "2025-11-25T10:00:00.000Z"
}
```

**Error - Asiento Descuadrado (400):**
```json
{
  "error": "El asiento no cuadra. Total Debe: 6000.00, Total Haber: 5000.00, Diferencia: 1000.00"
}
```

**Error - Monto Cero (400):**
```json
{
  "error": "El monto total del asiento debe ser mayor a cero"
}
```

---

### Listar Asientos
```
GET /api/journal
```

**Query Parameters:**
- `search`: Buscar por número de asiento, descripción o voucher
- `isPosted`: Filtrar por estado (true/false)
- `currencyId`: Filtrar por moneda
- `startDate`: Fecha inicial (YYYY-MM-DD)
- `endDate`: Fecha final (YYYY-MM-DD)
- `page`: Página (default: 1)
- `limit`: Registros por página (default: 20)

---

### Obtener Asiento por ID
```
GET /api/journal/:id
```

---

### Obtener Asiento por Número
```
GET /api/journal/number/:entryNumber
```

---

### Actualizar Asiento (Solo no publicados)
```
PUT /api/journal/:id
```

**Body:** (campos opcionales)
```json
{
  "entryDate": "2025-11-26",
  "description": "Descripción actualizada",
  "lines": [...]
}
```

---

### Publicar Asiento
```
POST /api/journal/:id/post
```

Una vez publicado, el asiento no puede ser modificado ni eliminado. Solo puede ser reversado.

---

### Eliminar Asiento (Solo no publicados)
```
DELETE /api/journal/:id
```

---

### Reversar Asiento (Solo publicados)
```
POST /api/journal/:id/reverse
```

**Body:**
```json
{
  "reversalDate": "2025-11-26",
  "description": "Reversión por error en factura"
}
```

Crea un nuevo asiento invirtiendo los montos (lo que era débito se vuelve crédito y viceversa).

---

## Reglas de Validación

### Partida Doble
1. **Balance Obligatorio**: La suma de todos los débitos debe ser igual a la suma de todos los créditos
2. **Monto Positivo**: El total del asiento debe ser mayor a cero
3. **Mínimo 2 Líneas**: Un asiento debe tener al menos 2 líneas
4. **Una Naturaleza por Línea**: Cada línea solo puede tener débito O crédito, no ambos

### Transacción Atómica
- Todos los cambios (cabecera + líneas) se ejecutan en una sola transacción de base de datos
- Si falla alguna parte, no se guarda nada
- Garantiza integridad de datos

### Multimoneda
- Los montos se guardan en la moneda original del documento
- Se guarda la tasa de cambio para conversión a la moneda base
- Ejemplo: Compra de $1,000 USD con tasa 36.75 → Se guarda `1000.00` con `exchangeRate: 36.75`

---

## Ejemplos de Asientos

### Compra de Inventario
```json
{
  "entryDate": "2025-11-25",
  "description": "Compra de mercadería a Proveedor XYZ",
  "currencyId": 1,
  "lines": [
    { "accountId": 10, "description": "Inventario", "debitAmount": 10000.00, "creditAmount": 0 },
    { "accountId": 20, "description": "Cuentas por Pagar", "debitAmount": 0, "creditAmount": 10000.00 }
  ]
}
```

### Registro de Nómina
```json
{
  "entryDate": "2025-11-30",
  "description": "Nómina Noviembre 2025",
  "currencyId": 1,
  "lines": [
    { "accountId": 50, "description": "Gasto Salarios", "debitAmount": 25000.00, "creditAmount": 0 },
    { "accountId": 51, "description": "INSS Patronal", "debitAmount": 5500.00, "creditAmount": 0 },
    { "accountId": 52, "description": "INATEC", "debitAmount": 500.00, "creditAmount": 0 },
    { "accountId": 11, "description": "Banco - Pago", "debitAmount": 0, "creditAmount": 22000.00 },
    { "accountId": 21, "description": "INSS por Pagar", "debitAmount": 0, "creditAmount": 8500.00 },
    { "accountId": 22, "description": "INATEC por Pagar", "debitAmount": 0, "creditAmount": 500.00 }
  ]
}
```

### Compra en Dólares (Multimoneda)
```json
{
  "entryDate": "2025-11-25",
  "description": "Importación de equipo desde USA",
  "currencyId": 2,
  "exchangeRate": 36.75,
  "lines": [
    { "accountId": 12, "description": "Equipo Importado", "debitAmount": 5000.00, "creditAmount": 0 },
    { "accountId": 23, "description": "Cuentas por Pagar USD", "debitAmount": 0, "creditAmount": 5000.00 }
  ]
}
```
