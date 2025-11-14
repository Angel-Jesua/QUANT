"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCreateClientInput = isCreateClientInput;
exports.isUpdateClientInput = isUpdateClientInput;
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
function isCreateClientInput(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const v = value;
    // Requeridos: clientCode, name, currencyId
    if (!isString(v.clientCode))
        return false;
    if (!/^[A-Za-z0-9-]{1,32}$/.test(v.clientCode.trim()))
        return false;
    if (!isString(v.name))
        return false;
    if (v.name.trim().length === 0)
        return false;
    if (!isPositiveInteger(v.currencyId))
        return false;
    // Opcionales: validar formatos si existen
    if (v.taxId !== undefined && v.taxId !== null) {
        if (!isString(v.taxId))
            return false;
        const t = v.taxId.trim();
        if (t.length < 1 || t.length > 32)
            return false;
    }
    if (v.contactName !== undefined && v.contactName !== null) {
        if (!isString(v.contactName))
            return false;
    }
    if (v.email !== undefined && v.email !== null) {
        if (!isString(v.email))
            return false;
        if (!isEmail(v.email))
            return false;
    }
    if (v.phone !== undefined && v.phone !== null) {
        if (!isString(v.phone))
            return false;
        if (!isE164(v.phone))
            return false;
    }
    if (v.address !== undefined && v.address !== null) {
        if (!isString(v.address))
            return false;
    }
    if (v.city !== undefined && v.city !== null) {
        if (!isString(v.city))
            return false;
    }
    if (v.state !== undefined && v.state !== null) {
        if (!isString(v.state))
            return false;
        const s = v.state.trim();
        if (s.length < 1 || s.length > 8)
            return false;
    }
    if (v.country !== undefined) {
        if (!isString(v.country))
            return false;
        if (!isIsoAlpha2Upper(v.country))
            return false;
    }
    if (v.postalCode !== undefined && v.postalCode !== null) {
        if (!isString(v.postalCode))
            return false;
        const p = v.postalCode.trim();
        if (p.length < 1 || p.length > 16)
            return false;
    }
    if (v.creditLimit !== undefined && v.creditLimit !== null) {
        if (!isNonNegativeNumeric(v.creditLimit))
            return false;
    }
    if (v.isActive !== undefined) {
        if (typeof v.isActive !== 'boolean')
            return false;
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
function isUpdateClientInput(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const v = value;
    const allowed = new Set([
        'clientCode',
        'taxId',
        'name',
        'contactName',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postalCode',
        'creditLimit',
        'currencyId',
        'isActive',
    ]);
    const keys = Object.keys(v).filter((k) => allowed.has(k));
    if (keys.length === 0)
        return false;
    // Reglas por campo (todos opcionales)
    if (v.clientCode !== undefined) {
        if (!isString(v.clientCode))
            return false;
        if (!/^[A-Za-z0-9-]{1,32}$/.test(v.clientCode.trim()))
            return false;
    }
    if (v.taxId !== undefined) {
        if (v.taxId !== null && !isString(v.taxId))
            return false;
        if (isString(v.taxId)) {
            const t = v.taxId.trim();
            if (t.length < 1 || t.length > 32)
                return false;
        }
    }
    if (v.name !== undefined) {
        if (!isString(v.name))
            return false;
        if (v.name.trim().length === 0)
            return false;
    }
    if (v.contactName !== undefined) {
        if (v.contactName !== null && !isString(v.contactName))
            return false;
    }
    if (v.email !== undefined) {
        if (v.email !== null && !isString(v.email))
            return false;
        if (isString(v.email) && !isEmail(v.email))
            return false;
    }
    if (v.phone !== undefined) {
        if (v.phone !== null && !isString(v.phone))
            return false;
        if (isString(v.phone) && !isE164(v.phone))
            return false;
    }
    if (v.address !== undefined) {
        if (v.address !== null && !isString(v.address))
            return false;
    }
    if (v.city !== undefined) {
        if (v.city !== null && !isString(v.city))
            return false;
    }
    if (v.state !== undefined) {
        if (v.state !== null && !isString(v.state))
            return false;
        if (isString(v.state)) {
            const s = v.state.trim();
            if (s.length < 1 || s.length > 8)
                return false;
        }
    }
    if (v.country !== undefined) {
        if (!isString(v.country))
            return false;
        if (!isIsoAlpha2Upper(v.country))
            return false;
    }
    if (v.postalCode !== undefined) {
        if (v.postalCode !== null && !isString(v.postalCode))
            return false;
        if (isString(v.postalCode)) {
            const p = v.postalCode.trim();
            if (p.length < 1 || p.length > 16)
                return false;
        }
    }
    if (v.creditLimit !== undefined) {
        if (v.creditLimit !== null && !isNonNegativeNumeric(v.creditLimit))
            return false;
    }
    if (v.currencyId !== undefined) {
        if (!isPositiveInteger(v.currencyId))
            return false;
    }
    if (v.isActive !== undefined) {
        if (typeof v.isActive !== 'boolean')
            return false;
    }
    return true;
}
/* ---------------------------------------------------------------------------------------------- */
/* Helpers de validación                                                                           */
/* ---------------------------------------------------------------------------------------------- */
function isString(x) {
    return typeof x === 'string';
}
function isPositiveInteger(x) {
    return typeof x === 'number' && Number.isInteger(x) && x > 0;
}
function isNonNegativeNumeric(x) {
    if (typeof x === 'number')
        return x >= 0;
    if (typeof x === 'string') {
        const t = x.trim();
        if (t.length === 0)
            return false;
        const n = Number(t);
        return Number.isFinite(n) && n >= 0;
    }
    return false;
}
function isEmail(x) {
    // Regex simple y pragmática; no pretende cubrir 100% del RFC
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
}
function isE164(x) {
    // E.164: "+" seguido de 1–15 dígitos, primer dígito 1–9
    return /^\+[1-9]\d{1,14}$/.test(x.trim());
}
function isIsoAlpha2Upper(x) {
    return /^[A-Z]{2}$/.test(x.trim());
}
/* ---------------------------------------------------------------------------------------------- */
/* Notas finales                                                                                    */
/* ---------------------------------------------------------------------------------------------- */
// Las funciones de guarda anteriores aseguran tipado primario correcto y formatos básicos,
// pero no sustituyen reglas de negocio ni verificaciones de existencia/unicidad.
// El servicio aplica normalizaciones (mayúsculas/minúsculas, trimming) y auditorías.
