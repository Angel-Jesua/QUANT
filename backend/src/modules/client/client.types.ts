/**
 * Tipos y utilidades del módulo Client
 *
 * Este archivo define alias de tipos con marca (branding) para el dominio, DTOs de entrada
 * para creación y actualización de clientes, tipos de entidad y funciones de guarda (type guards)
 * de tiempo de ejecución para un uso seguro con TypeScript en modo estricto.
 *
 * Referencias de formato:
 * - ISO 3166-1 alfa-2 (CountryCode): códigos de país de 2 letras en mayúsculas, p. ej. "NI", "US".
 * - E.164 (PhoneE164): números telefónicos internacionales, p. ej. "+50588887777".
 *
 * Notas:
 * - Las validaciones de negocio adicionales (unicidad, existencia de moneda, normalizaciones) ocurren en la capa de servicios.
 * - creditLimit se almacena como Prisma.Decimal en la capa de datos/servicio y se expone como string en las respuestas API.
 */

import { Prisma } from '@prisma/client';

/**
 * Utilidad para crear tipos con "marca" (branding) nominal.
 * La marca previene mezclas accidentales entre dominios al nivel de tipos.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/* ---------------------------------------------------------------------------------------------- */
/* Alias de tipos de dominio (con marca)                                                           */
/* ---------------------------------------------------------------------------------------------- */

/**
 * ClientCode: string de 1–32 caracteres alfanuméricos y guiones.
 * Ejemplos: "ABC-001", "CLIENTE12".
 */
export type ClientCode = Brand<string, 'ClientCode'>;

/**
 * TaxId: string de 1–32 caracteres (formato depende de país/autoridad).
 * Ejemplos: "J031234567", "RUC-00112233".
 */
export type TaxId = Brand<string, 'TaxId'>;

/**
 * Email: string con formato de correo válido (RFC5322 simplificado).
 * Ejemplos: "persona@dominio.com".
 */
export type Email = Brand<string, 'Email'>;

/**
 * PhoneE164: string en formato E.164. Debe iniciar con "+" seguido de 1–15 dígitos.
 * Ejemplos: "+50588887777", "+12025550123".
 */
export type PhoneE164 = Brand<string, 'PhoneE164'>;

/**
 * CountryCode: string ISO 3166-1 alfa-2 en mayúsculas.
 * Ejemplos: "NI", "US".
 */
export type CountryCode = Brand<string, 'CountryCode'>;

/**
 * CurrencyId: entero positivo que identifica la moneda.
 */
export type CurrencyId = Brand<number, 'CurrencyId'>;

/**
 * MoneyNonNegative: number no negativo, usado para límites de crédito.
 * Nota: Los DTO también aceptan string numérico por compatibilidad, pero el alias es number.
 */
export type MoneyNonNegative = Brand<number, 'MoneyNonNegative'>;

/* ---------------------------------------------------------------------------------------------- */
/* Interfaz base de campos compartidos                                                             */
/* ---------------------------------------------------------------------------------------------- */

/**
 * BaseClientFields: Campos comunes entre creación y actualización.
 *
 * Todos los campos aquí son opcionales para permitir su reutilización en distintos DTOs,
 * y se documenta claramente el propósito, formato y si admiten null/undefined.
 *
 * Aclaración: name debe ser string no vacío cuando se utiliza. Las reglas de negocio
 * (p. ej. longitud máxima de clientCode, existencia de currencyId) se verifican en servicios.
 */
export interface BaseClientFields {
  /**
   * Identificación fiscal del cliente.
   * - Formato: TaxId (string 1–32 caracteres). Normalmente en mayúsculas.
   * - Ejemplo: "J031234567"
   * - Admite: string o null (para limpiar el campo), undefined si no se provee.
   */
  taxId?: TaxId | null;

  /**
   * Nombre legal o comercial del cliente.
   * - Formato: string no vacío.
   * - Ejemplo: "IURUS CONSULTUS Nicaragua S.A."
   * - Admite: string (no vacío), undefined si no se provee.
   */
  name?: string;

  /**
   * Correo electrónico de contacto.
   * - Formato: Email válido (RFC5322 simplificado).
   * - Ejemplo: "contabilidad@iurus.com"
   * - Admite: Email o null, undefined si no se provee.
   */
  email?: Email | null;

  /**
   * Teléfono en formato internacional E.164.
   * - Formato: "+[país][número]" con 1–15 dígitos después de "+".
   * - Ejemplo: "+50588887777"
   * - Admite: PhoneE164 o null, undefined si no se provee.
   */
  phone?: PhoneE164 | null;

  /**
   * Dirección física (línea 1).
   * - Formato: string.
   * - Ejemplo: "Km 7 Carretera a Masaya, edificio Plaza"
   * - Admite: string o null, undefined si no se provee.
   */
  address?: string | null;

  /**
   * Ciudad.
   * - Formato: string.
   * - Ejemplo: "Managua"
   * - Admite: string o null, undefined si no se provee.
   */
  city?: string | null;

  /**
   * Código de país ISO 3166-1 alfa-2 en mayúsculas.
   * - Formato: CountryCode (2 letras en mayúsculas).
   * - Ejemplo: "NI"
   * - Admite: CountryCode, undefined si no se provee (el backend puede aplicar un valor por defecto).
   */
  country?: CountryCode;

  /**
   * Límite de crédito.
   * - Formato: MoneyNonNegative (number >= 0) o string numérico que se normalizará.
   * - Ejemplos: 0, 1000, "2500.50"
   * - Admite: number no negativo o string numérica, undefined si no se provee.
   */
  creditLimit?: MoneyNonNegative | string;

  /**
   * Identificador de moneda.
   * - Formato: CurrencyId (entero positivo).
   * - Ejemplo: 1
   * - Admite: CurrencyId, undefined si no se provee.
   */
  currencyId?: CurrencyId;

  /**
   * Estado de actividad del cliente.
   * - Formato: boolean.
   * - Ejemplo: true
   * - Admite: boolean, undefined si no se provee (el backend aplica por defecto "true" al crear).
   */
  isActive?: boolean;
}

/* ---------------------------------------------------------------------------------------------- */
/* Utility Types                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

/**
 * RequireAtLeastOne<T>: obliga a que al menos una propiedad de T esté presente.
 */
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Pick<T, K> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Subconjunto reutilizable para actualizaciones.
 * Incluye clientCode opcional además de los campos base (name y currencyId opcionales).
 */
export type ClientUpdatableFields =
  Omit<BaseClientFields, 'name' | 'currencyId'> &
  Partial<Pick<BaseClientFields, 'name' | 'currencyId'>> & {
    clientCode?: ClientCode;
  };

/* ---------------------------------------------------------------------------------------------- */
/* DTOs de entrada (Create / Update)                                                               */
/* ---------------------------------------------------------------------------------------------- */

/**
 * CreateClientInput: intersección de BaseClientFields con los requeridos para crear.
 * - Requeridos: clientCode, name (no vacío), currencyId.
 * - El resto de campos son opcionales.
 * - Readonly: se marca como de solo lectura para evitar mutaciones posteriores.
 * - Backend aplica valores por defecto: si isActive no se provee, se usa true.
 */
export type CreateClientInput = Readonly<
  BaseClientFields & {
    clientCode: ClientCode;
    name: string;
    currencyId: CurrencyId;
  }
>;

/**
 * UpdateClientInput: todas las propiedades opcionales pero se exige al menos una.
 * - Basado en ClientUpdatableFields (incluye clientCode?, name?, currencyId? y el resto).
 * - Readonly: de solo lectura para evitar mutaciones posteriores.
 */
export type UpdateClientInput = Readonly<RequireAtLeastOne<ClientUpdatableFields>>;

/**
 * Alias explícitos de solo lectura (idénticos a los tipos principales).
 */
export type ReadonlyCreateClientInput = CreateClientInput;
export type ReadonlyUpdateClientInput = UpdateClientInput;

/* ---------------------------------------------------------------------------------------------- */
/* Compatibilidad con superficie pública existente                                                  */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Mantener nombres de exportación utilizados previamente para no romper importaciones.
 * Los tipos previos ICreateClient/IUpdateClient se mapean a los nuevos tipos estrictos.
 */
export type ICreateClient = CreateClientInput;
export type IUpdateClient = UpdateClientInput;

/* ---------------------------------------------------------------------------------------------- */
/* Entidades internas y respuestas API                                                              */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Entidad Client interna como la devuelve Prisma (capa de servicio/repositorio).
 */
export interface IClient {
  id: number;
  clientCode: string;
  taxId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country: string;
  creditLimit: Prisma.Decimal;
  currencyId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: number;
  updatedById?: number | null;
}

/**
 * Respuesta API para Client: creditLimit se presenta como string.
 */
export interface IClientResponse extends Omit<IClient, 'creditLimit'> {
  creditLimit: string;
}

/**
 * Contexto de la petición para auditoría y trazabilidad.
 */
export interface IRequestContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: number;
}

/**
 * Tipo de dominio opcional "Client" normalizado (no impuesto en esta tarea).
 * Útil si se requiere una representación de dominio coherente dentro de la capa de servicio.
 */
export interface Client {
  id: number;
  clientCode: ClientCode;
  taxId?: TaxId | null;
  name: string;
  email?: Email | null;
  phone?: PhoneE164 | null;
  address?: string | null;
  city?: string | null;
  country: CountryCode;
  creditLimit: Prisma.Decimal;
  currencyId: CurrencyId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: number;
  updatedById?: number | null;
}

/* ---------------------------------------------------------------------------------------------- */
/* Filtros y opciones para listado                                                                 */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Campos permitidos para ordenamiento en listados de clientes.
 */
export type ClientOrderByField =
  | 'clientCode'
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'country'
  | 'currencyId'
  | 'isActive';

/**
 * Filtros y opciones de paginación/orden para obtener clientes.
 * - isActive: filtra por estado activo/inactivo
 * - countryCode: CountryCode (ISO 3166-1 alfa-2)
 * - currencyId: CurrencyId (entero positivo)
 * - search: coincidencia parcial (insensible a mayúsculas) en clientCode, name o taxId
 * - limit/offset: paginación
 * - orderBy/orderDir: ordenamiento estable; por defecto clientCode asc
 */
export interface ClientListFilters {
  isActive?: boolean;
  countryCode?: CountryCode;
  currencyId?: CurrencyId;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: ClientOrderByField;
  orderDir?: 'asc' | 'desc';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Alias de compatibilidad si se requiere en otras capas.
 */
export type IClientListFilters = ClientListFilters;

/* ---------------------------------------------------------------------------------------------- */
/* Type Guards (guardas de tipos)                                                                   */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Guarda de tipo para CreateClientInput.
 * Verifica presencia de requeridos, tipos primarios correctos, que currencyId sea entero positivo
 * y que creditLimit sea no negativo cuando exista. También valida formatos básicos (email, E.164, ISO país).
 *
 * Nota: Estas guardas no sustituyen validaciones de negocio.
 */
export function isCreateClientInput(value: unknown): value is CreateClientInput {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  // Requeridos: clientCode, name, currencyId
  if (!isString(v.clientCode)) return false;
  if (!/^[A-Za-z0-9-]{1,32}$/.test(v.clientCode.trim())) return false;

  if (!isString(v.name)) return false;
  if (v.name.trim().length === 0) return false;

  if (!isPositiveInteger(v.currencyId)) return false;

  // Opcionales: validar formatos si existen
  if (v.taxId !== undefined && v.taxId !== null) {
    if (!isString(v.taxId)) return false;
    const t = v.taxId.trim();
    if (t.length < 1 || t.length > 32) return false;
  }

  if (v.email !== undefined && v.email !== null) {
    if (!isString(v.email)) return false;
    if (!isEmail(v.email)) return false;
  }

  if (v.phone !== undefined && v.phone !== null) {
    if (!isString(v.phone)) return false;
    if (!isE164(v.phone)) return false;
  }

  if (v.address !== undefined && v.address !== null) {
    if (!isString(v.address)) return false;
  }

  if (v.city !== undefined && v.city !== null) {
    if (!isString(v.city)) return false;
  }

  if (v.country !== undefined) {
    if (!isString(v.country)) return false;
    if (!isIsoAlpha2Upper(v.country)) return false;
  }

  if (v.creditLimit !== undefined && v.creditLimit !== null) {
    if (!isNonNegativeNumeric(v.creditLimit)) return false;
  }

  if (v.isActive !== undefined) {
    if (typeof v.isActive !== 'boolean') return false;
  }

  return true;
}

/**
 * Guarda de tipo para UpdateClientInput.
 * Verifica que al menos una propiedad permitida esté presente, tipos primarios correctos,
 * que currencyId sea entero positivo y que creditLimit sea no negativo cuando exista.
 * Valida formatos básicos (email, E.164, ISO país).
 *
 * Nota: Estas guardas no sustituyen validaciones de negocio.
 */
export function isUpdateClientInput(value: unknown): value is UpdateClientInput {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;

  const allowed = new Set<string>([
    'clientCode',
    'taxId',
    'name',
    'email',
    'phone',
    'address',
    'city',
    'country',
    'creditLimit',
    'currencyId',
    'isActive',
  ]);

  const keys = Object.keys(v).filter((k) => allowed.has(k));
  if (keys.length === 0) return false;

  // Reglas por campo (todos opcionales)
  if (v.clientCode !== undefined) {
    if (!isString(v.clientCode)) return false;
    if (!/^[A-Za-z0-9-]{1,32}$/.test(v.clientCode.trim())) return false;
  }

  if (v.taxId !== undefined) {
    if (v.taxId !== null && !isString(v.taxId)) return false;
    if (isString(v.taxId)) {
      const t = v.taxId.trim();
      if (t.length < 1 || t.length > 32) return false;
    }
  }

  if (v.name !== undefined) {
    if (!isString(v.name)) return false;
    if (v.name.trim().length === 0) return false;
  }

  if (v.email !== undefined) {
    if (v.email !== null && !isString(v.email)) return false;
    if (isString(v.email) && !isEmail(v.email)) return false;
  }

  if (v.phone !== undefined) {
    if (v.phone !== null && !isString(v.phone)) return false;
    if (isString(v.phone) && !isE164(v.phone)) return false;
  }

  if (v.address !== undefined) {
    if (v.address !== null && !isString(v.address)) return false;
  }

  if (v.city !== undefined) {
    if (v.city !== null && !isString(v.city)) return false;
  }

  if (v.country !== undefined) {
    if (!isString(v.country)) return false;
    if (!isIsoAlpha2Upper(v.country)) return false;
  }

  if (v.creditLimit !== undefined) {
    if (v.creditLimit !== null && !isNonNegativeNumeric(v.creditLimit)) return false;
  }

  if (v.currencyId !== undefined) {
    if (!isPositiveInteger(v.currencyId)) return false;
  }

  if (v.isActive !== undefined) {
    if (typeof v.isActive !== 'boolean') return false;
  }

  return true;
}

/* ---------------------------------------------------------------------------------------------- */
/* Helpers de validación                                                                           */
/* ---------------------------------------------------------------------------------------------- */

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isPositiveInteger(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x > 0;
}

function isNonNegativeNumeric(x: unknown): boolean {
  if (typeof x === 'number') return x >= 0;
  if (typeof x === 'string') {
    const t = x.trim();
    if (t.length === 0) return false;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0;
  }
  return false;
}

function isEmail(x: string): boolean {
  // Regex simple y pragmática; no pretende cubrir 100% del RFC
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
}

function isE164(x: string): boolean {
  // E.164: "+" seguido de 1–15 dígitos, primer dígito 1–9
  return /^\+[1-9]\d{1,14}$/.test(x.trim());
}

function isIsoAlpha2Upper(x: string): boolean {
  return /^[A-Z]{2}$/.test(x.trim());
}

/* ---------------------------------------------------------------------------------------------- */
/* Notas finales                                                                                    */
/* ---------------------------------------------------------------------------------------------- */
// Las funciones de guarda anteriores aseguran tipado primario correcto y formatos básicos,
// pero no sustituyen reglas de negocio ni verificaciones de existencia/unicidad.
// El servicio aplica normalizaciones (mayúsculas/minúsculas, trimming) y auditorías.
