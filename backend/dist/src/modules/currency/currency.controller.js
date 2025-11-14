"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyController = void 0;
const currency_service_1 = require("./currency.service");
const error_1 = require("../../utils/error");
const client_1 = require("@prisma/client");
class CurrencyController {
    constructor() {
        this.currencyService = new currency_service_1.CurrencyService();
    }
    /**
     * Get all currencies with optional pagination and filters.
     * Query params: page, limit, search, isActive
     * Returns 200 on success; 500 on unexpected error.
     */
    async getAllCurrencies(req, res) {
        try {
            const page = parsePositiveInt(req.query.page, 1);
            const limit = parseLimit(req.query.limit, 20, 100);
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            const isActiveFilter = parseBooleanQuery(req.query.isActive);
            const list = await this.currencyService.getAllCurrencies();
            let filtered = list;
            if (search) {
                const s = search.toLowerCase();
                filtered = filtered.filter((c) => c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s));
            }
            if (typeof isActiveFilter === 'boolean') {
                filtered = filtered.filter((c) => c.isActive === isActiveFilter);
            }
            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / limit));
            const currentPage = Math.min(page, totalPages);
            const start = (currentPage - 1) * limit;
            const data = filtered.slice(start, start + limit);
            res.status(200).json({
                success: true,
                data,
                meta: {
                    page: currentPage,
                    limit,
                    total,
                    totalPages,
                },
            });
        }
        catch (error) {
            (0, error_1.logErrorContext)('currency.getAll.error', error, {
                ip: req.ip || req.connection?.remoteAddress,
                ua: req.get('User-Agent'),
            });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.update,
                entityType: 'currency',
                errorKey: 'fetch_currencies_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
            res.status(500).json({
                success: false,
                error: { message: 'Error interno del servidor' },
            });
        }
    }
    /**
     * Get currency by ID.
     * Params: id (numeric).
     * Returns: 200 on success; 400 for invalid id; 404 if not found; 500 on unexpected error.
     */
    async getCurrencyById(req, res) {
        try {
            const { id } = req.params;
            const currencyId = Number.parseInt(id, 10);
            if (Number.isNaN(currencyId) || currencyId <= 0) {
                res.status(400).json({
                    success: false,
                    error: { message: 'ID inválido' },
                });
                return;
            }
            const currency = await this.currencyService.getCurrencyById(currencyId);
            if (!currency) {
                res.status(404).json({
                    success: false,
                    error: { message: 'Moneda no encontrada' },
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: currency,
            });
        }
        catch (error) {
            (0, error_1.logErrorContext)('currency.getById.error', error, { id: req.params.id });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.update,
                entityType: 'currency',
                entityId: Number.parseInt(req.params.id, 10),
                errorKey: 'fetch_currency_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
            res.status(500).json({
                success: false,
                error: { message: 'Error interno del servidor' },
            });
        }
    }
    /**
     * Create a new currency.
     * Body: { code, name, symbol, exchangeRate|rate, isBaseCurrency?, decimalPlaces?, isActive? }.
     * Uses req.userId as createdBy.
     * Returns: 201 on success; 400 for validation/duplicate; 500 on unexpected error.
     */
    async createCurrency(req, res) {
        try {
            const body = req.body;
            const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
            const name = typeof body.name === 'string' ? body.name.trim() : '';
            const symbol = typeof body.symbol === 'string' ? body.symbol.trim() : '';
            const exchangeRateCandidate = body.exchangeRate ?? body.rate;
            const hasExchangeRate = exchangeRateCandidate !== undefined && exchangeRateCandidate !== null;
            const errors = {};
            if (code.length !== 3)
                errors.code = 'code must be a 3-character string';
            if (!name)
                errors.name = 'name is required';
            if (!symbol)
                errors.symbol = 'symbol is required';
            if (!hasExchangeRate)
                errors.exchangeRate = 'exchangeRate (or rate) is required';
            let exchangeRate = undefined;
            if (hasExchangeRate) {
                if (typeof exchangeRateCandidate === 'number') {
                    exchangeRate = exchangeRateCandidate;
                    if (!(exchangeRateCandidate > 0))
                        errors.exchangeRate = 'exchangeRate must be > 0';
                }
                else if (typeof exchangeRateCandidate === 'string') {
                    const v = exchangeRateCandidate.trim();
                    if (v.length === 0) {
                        errors.exchangeRate = 'exchangeRate must be provided';
                    }
                    else {
                        const num = Number(v);
                        if (!(num > 0))
                            errors.exchangeRate = 'exchangeRate must be > 0';
                        exchangeRate = v;
                    }
                }
                else {
                    errors.exchangeRate = 'exchangeRate must be a number or numeric string';
                }
            }
            if (Object.keys(errors).length > 0) {
                res.status(400).json({
                    success: false,
                    error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: errors },
                });
                return;
            }
            const requestContext = {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                userId: req.userId ?? req.user?.id,
            };
            const payload = {
                code,
                name,
                symbol,
                decimalPlaces: typeof body.decimalPlaces === 'number' ? body.decimalPlaces : undefined,
                isBaseCurrency: typeof body.isBaseCurrency === 'boolean' ? body.isBaseCurrency : undefined,
                exchangeRate,
                isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
            };
            const created = await this.currencyService.createCurrency(payload, requestContext);
            res.status(201).json({
                success: true,
                data: created,
            });
        }
        catch (error) {
            const e = error;
            const safeBody = req?.body;
            const validationCodes = new Set([
                'DUPLICATE_CODE',
                'EXCHANGE_RATE_REQUIRED',
                'RATE_MUST_BE_GT_ZERO',
                'BASE_RATE_NOT_ONE',
                'BASE_CONFLICT',
                'AUTH_REQUIRED',
            ]);
            if (e && validationCodes.has(e.message)) {
                const status = 400;
                res.status(status).json({
                    success: false,
                    error: { message: 'Validation error', code: e.message },
                });
                return;
            }
            (0, error_1.logErrorContext)('currency.create.error', error, { code: safeBody?.code, name: safeBody?.name });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.create,
                entityType: 'currency',
                errorKey: 'create_currency_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                newData: { code: safeBody?.code, name: safeBody?.name, symbol: safeBody?.symbol },
            });
            res.status(500).json({
                success: false,
                error: { message: 'Error interno del servidor' },
            });
        }
    }
    /**
     * Update currency.
     * Params: id.
     * Body: Partial fields { code?, name?, symbol?, rate|exchangeRate?, isActive?, decimalPlaces?, isBaseCurrency? }.
     * Rejects unknown properties; normalizes types; uses req.userId as updatedBy.
     * Returns: 200 success; 400 validation/unknown props; 404 not found; 500 unexpected.
     */
    async updateCurrency(req, res) {
        try {
            const idParam = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(idParam) || idParam <= 0) {
                res.status(400).json({
                    success: false,
                    error: { message: 'ID inválido' },
                });
                return;
            }
            const raw = req.body;
            const allowed = new Set([
                'code',
                'name',
                'symbol',
                'decimalPlaces',
                'isBaseCurrency',
                'exchangeRate',
                'rate',
                'isActive',
            ]);
            const unknownProps = Object.keys(raw).filter((k) => !allowed.has(k));
            if (unknownProps.length > 0) {
                res.status(400).json({
                    success: false,
                    error: { message: 'Propiedades no permitidas', code: 'UNKNOWN_PROPERTIES', details: unknownProps },
                });
                return;
            }
            const body = raw;
            const normalized = {};
            if (typeof body.code === 'string')
                normalized.code = body.code.trim().toUpperCase();
            if (typeof body.name === 'string')
                normalized.name = body.name.trim();
            if (typeof body.symbol === 'string')
                normalized.symbol = body.symbol.trim();
            if (typeof body.decimalPlaces === 'number')
                normalized.decimalPlaces = body.decimalPlaces;
            if (typeof body.isBaseCurrency === 'boolean')
                normalized.isBaseCurrency = body.isBaseCurrency;
            if (typeof body.isActive === 'boolean')
                normalized.isActive = body.isActive;
            if (body.exchangeRate !== undefined || body.rate !== undefined) {
                const candidate = body.exchangeRate ?? body.rate;
                if (typeof candidate === 'number') {
                    normalized.exchangeRate = candidate;
                }
                else if (typeof candidate === 'string') {
                    const v = candidate.trim();
                    if (v.length === 0) {
                        res.status(400).json({
                            success: false,
                            error: { message: 'exchangeRate debe ser numérico', code: 'VALIDATION_ERROR' },
                        });
                        return;
                    }
                    normalized.exchangeRate = v;
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: { message: 'exchangeRate debe ser numérico', code: 'VALIDATION_ERROR' },
                    });
                    return;
                }
            }
            const requestContext = {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                userId: req.userId ?? req.user?.id,
            };
            const updated = await this.currencyService.updateCurrency(idParam, normalized, requestContext);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    error: { message: 'Moneda no encontrada' },
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            const e = error;
            const known400 = new Set([
                'DUPLICATE_CODE',
                'EXCHANGE_RATE_REQUIRED',
                'RATE_MUST_BE_GT_ZERO',
                'BASE_RATE_NOT_ONE',
                'BASE_CONFLICT',
            ]);
            if (e && known400.has(e.message)) {
                res.status(400).json({
                    success: false,
                    error: { message: 'Validation error', code: e.message },
                });
                return;
            }
            const idParam = Number.parseInt(req.params.id, 10);
            (0, error_1.logErrorContext)('currency.update.error', error, { id: idParam });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.update,
                entityType: 'currency',
                entityId: Number.isNaN(idParam) ? undefined : idParam,
                errorKey: 'update_currency_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
            res.status(500).json({
                success: false,
                error: { message: 'Error interno del servidor' },
            });
        }
    }
    /**
     * Delete currency (logical or physical per service implementation).
     * Params: id.
     * Returns: 200 success; 404 when not found; 400 invalid id; 500 unexpected error.
     */
    async deleteCurrency(req, res) {
        try {
            const idParam = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(idParam) || idParam <= 0) {
                res.status(400).json({
                    success: false,
                    error: { message: 'ID inválido' },
                });
                return;
            }
            const requestContext = {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                userId: req.userId ?? req.user?.id,
            };
            const success = await this.currencyService.deleteCurrency(idParam, requestContext);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: { message: 'Moneda no encontrada' },
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: { id: idParam, deleted: true },
            });
        }
        catch (error) {
            const idParam = Number.parseInt(req.params.id, 10);
            (0, error_1.logErrorContext)('currency.delete.error', error, { id: idParam });
            await (0, error_1.logAuditError)({
                action: client_1.AuditAction.delete,
                entityType: 'currency',
                entityId: Number.isNaN(idParam) ? undefined : idParam,
                errorKey: 'delete_currency_error',
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
            });
            res.status(500).json({
                success: false,
                error: { message: 'Error interno del servidor' },
            });
        }
    }
}
exports.CurrencyController = CurrencyController;
function parsePositiveInt(input, defaultVal) {
    const v = typeof input === 'string' ? parseInt(input, 10) : typeof input === 'number' ? input : NaN;
    if (Number.isNaN(v) || v < 1)
        return defaultVal;
    return Math.floor(v);
}
function parseLimit(input, defaultVal, max) {
    const v = parsePositiveInt(input, defaultVal);
    return Math.min(max, v);
}
function parseBooleanQuery(input) {
    if (typeof input === 'boolean')
        return input;
    if (typeof input === 'string') {
        const s = input.trim().toLowerCase();
        if (s === 'true' || s === '1')
            return true;
        if (s === 'false' || s === '0')
            return false;
    }
    if (typeof input === 'number') {
        if (input === 1)
            return true;
        if (input === 0)
            return false;
    }
    return undefined;
}
