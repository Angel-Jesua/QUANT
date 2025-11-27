import { Request, Response } from 'express';
import { AccountService } from './account.service';
import {
  ICreateAccount,
  IUpdateAccount,
  IRequestContext,
  IAccountResponse,
  BulkImportRequest,
  BulkImportAccountItem,
} from './account.types';
import { logErrorContext, logAuditError } from '../../utils/error';
import { AuditAction } from '@prisma/client';

type AccountCreateDTO = ICreateAccount;
type AccountUpdateDTO = IUpdateAccount;
type Account = IAccountResponse;

export class AccountController {
  private accountService = new AccountService();

  /**
   * Get all accounts with optional pagination and filters.
   * Query params: page, limit|pageSize, search, isActive, type, currencyId, parentAccountId, isDetail
   * Returns 200 on success; 500 on unexpected error.
   */
  async getAllAccounts(req: Request, res: Response): Promise<void> {
    try {
      const page = parsePositiveInt(req.query.page, 1);
      const pageSize = parseLimit((req.query.pageSize ?? req.query.limit), 20, 1000);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const isActiveFilter = parseBooleanQuery(req.query.isActive);
      const isDetailFilter = parseBooleanQuery(req.query.isDetail);
      const currencyIdFilter = parseOptionalPositiveInt(req.query.currencyId);
      const parentAccountIdFilter = parseOptionalPositiveInt(req.query.parentAccountId);
      const typeFilter = typeof req.query.type === 'string' ? req.query.type.trim() : '';

      const list = await this.accountService.getAllAccounts();

      let filtered = list;
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.accountNumber.toLowerCase().includes(s) ||
            a.name.toLowerCase().includes(s)
        );
      }
      if (typeof isActiveFilter === 'boolean') {
        filtered = filtered.filter((a) => a.isActive === isActiveFilter);
      }
      if (typeof isDetailFilter === 'boolean') {
        filtered = filtered.filter((a) => a.isDetail === isDetailFilter);
      }
      if (typeof currencyIdFilter === 'number') {
        filtered = filtered.filter((a) => a.currencyId === currencyIdFilter);
      }
      if (typeof parentAccountIdFilter === 'number') {
        filtered = filtered.filter((a) => (a.parentAccountId ?? -1) === parentAccountIdFilter);
      }
      if (typeFilter) {
        filtered = filtered.filter((a) => a.type === typeFilter);
      }

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * pageSize;
      const data = filtered.slice(start, start + pageSize);

      res.status(200).json({
        success: true,
        data,
        meta: {
          page: currentPage,
          pageSize,
          total,
          totalPages,
        },
      });
    } catch (error) {
      logErrorContext('account.getAll.error', error, {
        ip: req.ip || (req as any).connection?.remoteAddress,
        ua: req.get('User-Agent'),
      });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'account',
        errorKey: 'fetch_accounts_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' },
      });
    }
  }

  /**
   * Get account by ID.
   * Params: id (numeric).
   * Returns: 200 on success; 400 for invalid id; 404 if not found; 500 on unexpected error.
   */
  async getAccountById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const accountId = Number.parseInt(id, 10);
      if (Number.isNaN(accountId) || accountId <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID inválido' },
        });
        return;
      }

      const account = await this.accountService.getAccountById(accountId);
      if (!account) {
        res.status(404).json({
          success: false,
          error: { message: 'Cuenta no encontrada' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error) {
      logErrorContext('account.getById.error', error, { id: req.params.id });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'account',
        entityId: Number.parseInt(req.params.id, 10),
        errorKey: 'fetch_account_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' },
      });
    }
  }

  /**
   * Create a new account.
   * Body: { accountNumber, name, type, currencyId, description?, parentAccountId?, isDetail?, isActive? }.
   * Uses req.userId as createdBy.
   * Returns: 201 on success; 400 for validation/duplicate; 500 on unexpected error.
   */
  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as Partial<AccountCreateDTO>;

      const accountNumber =
        typeof body.accountNumber === 'string' ? body.accountNumber.trim().toUpperCase() : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const type = typeof body.type === 'string' ? body.type.trim() : '';
      const currencyIdCandidate = body.currencyId;

      const errors: Record<string, string> = {};
      if (!accountNumber || accountNumber.length > 20)
        errors.accountNumber = 'accountNumber debe ser 1-20 caracteres';
      if (!name) errors.name = 'name es requerido';
      if (!isValidAccountTypeString(type))
        errors.type = 'type inválido';
      if (typeof currencyIdCandidate !== 'number' || !Number.isInteger(currencyIdCandidate) || currencyIdCandidate <= 0) {
        errors.currencyId = 'currencyId debe ser un entero positivo';
      }

      if (body.parentAccountId !== undefined && body.parentAccountId !== null) {
        if (typeof body.parentAccountId !== 'number' || !Number.isInteger(body.parentAccountId) || body.parentAccountId <= 0) {
          errors.parentAccountId = 'parentAccountId debe ser un entero positivo';
        }
      }

      if (body.isDetail !== undefined && typeof body.isDetail !== 'boolean') {
        errors.isDetail = 'isDetail debe ser boolean';
      }
      if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
        errors.isActive = 'isActive debe ser boolean';
      }
      if (body.description !== undefined && typeof body.description !== 'string') {
        errors.description = 'description debe ser string';
      }

      if (Object.keys(errors).length > 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: errors },
        });
        return;
      }

      const requestContext: IRequestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: (req as any).userId ?? (req as any).user?.id,
      };

      const payload: ICreateAccount = {
        accountNumber,
        name,
        type: type as any,
        currencyId: currencyIdCandidate as number,
        description: typeof body.description === 'string' ? body.description.trim() : undefined,
        parentAccountId: typeof body.parentAccountId === 'number' ? body.parentAccountId : undefined,
        isDetail: typeof body.isDetail === 'boolean' ? body.isDetail : undefined,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      };

      const created = await this.accountService.createAccount(payload, requestContext);

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      const e = error as Error;
      const safeBody = req?.body as Partial<ICreateAccount> | undefined;

      const validationCodes = new Set([
        'DUPLICATE_ACCOUNT_NUMBER',
        'ACCOUNT_NUMBER_INVALID',
        'NAME_REQUIRED',
        'INVALID_ACCOUNT_TYPE',
        'INVALID_CURRENCY',
        'INVALID_PARENT',
        'AUTH_REQUIRED',
      ]);
      if (e && validationCodes.has(e.message)) {
        const status = e.message === 'AUTH_REQUIRED' ? 401 : 400;
        res.status(status).json({
          success: false,
          error: { message: 'Validation error', code: e.message },
        });
        return;
      }

      logErrorContext('account.create.error', error, {
        accountNumber: safeBody?.accountNumber,
        name: safeBody?.name,
      });
      await logAuditError({
        action: AuditAction.create,
        entityType: 'account',
        errorKey: 'create_account_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        newData: { accountNumber: safeBody?.accountNumber, name: safeBody?.name },
      });
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' },
      });
    }
  }

  /**
   * Update account.
   * Params: id.
   * Body: Partial fields { accountNumber?, name?, description?, type?, currencyId?, parentAccountId|null?, isDetail?, isActive? }.
   * Unknown properties rejected.
   * Returns: 200 success; 400 validation/unknown props; 404 not found; 500 unexpected.
   */
  async updateAccount(req: Request, res: Response): Promise<void> {
    try {
      const idParam = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(idParam) || idParam <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID inválido' },
        });
        return;
      }

      const raw = req.body as Record<string, unknown>;
      const allowed = new Set([
        'accountNumber',
        'name',
        'description',
        'type',
        'currencyId',
        'parentAccountId',
        'isDetail',
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

      const body = raw as Partial<AccountUpdateDTO & { accountNumber?: string }>;

      const normalized: Partial<AccountUpdateDTO & { accountNumber?: string }> = {};
      if (typeof body.accountNumber === 'string') {
        const v = body.accountNumber.trim().toUpperCase();
        if (!v || v.length > 20) {
          res.status(400).json({
            success: false,
            error: { message: 'accountNumber debe ser 1-20 caracteres', code: 'VALIDATION_ERROR' },
          });
          return;
        }
        normalized.accountNumber = v;
      }
      if (typeof body.name === 'string') normalized.name = body.name.trim();
      if (typeof body.description === 'string') normalized.description = body.description.trim();
      if (body.description === null) normalized.description = null;

      if (typeof body.type === 'string') {
        const t = body.type.trim();
        if (!isValidAccountTypeString(t)) {
          res.status(400).json({
            success: false,
            error: { message: 'type inválido', code: 'VALIDATION_ERROR' },
          });
          return;
        }
        normalized.type = t as any;
      }

      if (typeof body.currencyId === 'number') {
        if (!Number.isInteger(body.currencyId) || body.currencyId <= 0) {
          res.status(400).json({
            success: false,
            error: { message: 'currencyId debe ser un entero positivo', code: 'VALIDATION_ERROR' },
          });
          return;
        }
        normalized.currencyId = body.currencyId;
      }

      if (body.parentAccountId !== undefined) {
        if (body.parentAccountId === null) {
          normalized.parentAccountId = null;
        } else if (typeof body.parentAccountId === 'number') {
          if (!Number.isInteger(body.parentAccountId) || body.parentAccountId <= 0) {
            res.status(400).json({
              success: false,
              error: { message: 'parentAccountId debe ser un entero positivo', code: 'VALIDATION_ERROR' },
            });
            return;
          }
          normalized.parentAccountId = body.parentAccountId;
        } else {
          res.status(400).json({
            success: false,
            error: { message: 'parentAccountId inválido', code: 'VALIDATION_ERROR' },
          });
          return;
        }
      }

      if (typeof body.isDetail === 'boolean') normalized.isDetail = body.isDetail;
      if (typeof body.isActive === 'boolean') normalized.isActive = body.isActive;

      const requestContext: IRequestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: (req as any).userId ?? (req as any).user?.id,
      };

      const updated = await this.accountService.updateAccount(idParam, normalized as IUpdateAccount & { accountNumber?: string }, requestContext);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { message: 'Cuenta no encontrada' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      const e = error as Error;
      if (e) {
        if (e.message === 'INVALID_OPERATION') {
          res.status(403).json({
            success: false,
            error: { message: 'Operation not allowed', code: e.message },
          });
          return;
        }
        const known400 = new Set([
          'DUPLICATE_ACCOUNT_NUMBER',
          'ACCOUNT_NUMBER_INVALID',
          'NAME_REQUIRED',
          'INVALID_ACCOUNT_TYPE',
          'INVALID_CURRENCY',
          'INVALID_PARENT',
        ]);
        if (known400.has(e.message)) {
          res.status(400).json({
            success: false,
            error: { message: 'Validation error', code: e.message },
          });
          return;
        }
      }

      const idParam = Number.parseInt(req.params.id, 10);
      logErrorContext('account.update.error', error, { id: idParam });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'account',
        entityId: Number.isNaN(idParam) ? undefined : idParam,
        errorKey: 'update_account_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' },
      });
    }
  }

  /**
   * Delete account (soft delete: mark inactive).
   * Params: id.
   * Returns: 200 success; 404 when not found; 400 invalid id; 500 unexpected error.
   */
  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const idParam = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(idParam) || idParam <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID inválido' },
        });
        return;
      }

      const requestContext: IRequestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: (req as any).userId ?? (req as any).user?.id,
      };

      const success = await this.accountService.deleteAccount(idParam, requestContext);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { message: 'Cuenta no encontrada' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { id: idParam, deleted: true },
      });
    } catch (error) {
      const idParam = Number.parseInt(req.params.id, 10);
      logErrorContext('account.delete.error', error, { id: idParam });
      await logAuditError({
        action: AuditAction.delete,
        entityType: 'account',
        entityId: Number.isNaN(idParam) ? undefined : idParam,
        errorKey: 'delete_account_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' },
      });
    }
  }

  /**
   * Bulk import accounts from pre-processed data.
   * Body: { accounts: BulkImportAccountItem[] }
   * Returns: 200 with import results; 400 for validation errors; 500 on unexpected error.
   */
  async bulkImport(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as BulkImportRequest;

      // Validate request structure
      if (!body || !Array.isArray(body.accounts)) {
        res.status(400).json({
          success: false,
          error: { message: 'Se requiere un array de cuentas', code: 'INVALID_PAYLOAD' },
        });
        return;
      }

      if (body.accounts.length === 0) {
        res.status(400).json({
          success: false,
          error: { message: 'El array de cuentas está vacío', code: 'EMPTY_ACCOUNTS' },
        });
        return;
      }

      if (body.accounts.length > 1000) {
        res.status(400).json({
          success: false,
          error: { message: 'Máximo 1000 cuentas por importación', code: 'TOO_MANY_ACCOUNTS' },
        });
        return;
      }

      // Validate each account item
      const validationErrors = this.validateBulkImportItems(body.accounts);
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Errores de validación en las cuentas',
            code: 'VALIDATION_ERROR',
            details: validationErrors,
          },
        });
        return;
      }

      const requestContext: IRequestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: (req as any).userId ?? (req as any).user?.id,
      };

      const result = await this.accountService.bulkImport(
        body.accounts,
        requestContext,
        body.updateExisting ?? false
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logErrorContext('account.bulkImport.error', error, {
        ip: req.ip || (req as any).connection?.remoteAddress,
        ua: req.get('User-Agent'),
      });
      await logAuditError({
        action: AuditAction.create,
        entityType: 'account',
        errorKey: 'bulk_import_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor durante la importación' },
      });
    }
  }

  /**
   * Validate bulk import items and return validation errors
   */
  private validateBulkImportItems(
    accounts: BulkImportAccountItem[]
  ): Array<{ index: number; accountNumber: string; errors: Record<string, string> }> {
    const validationErrors: Array<{
      index: number;
      accountNumber: string;
      errors: Record<string, string>;
    }> = [];

    const seenAccountNumbers = new Set<string>();

    accounts.forEach((item, index) => {
      const errors: Record<string, string> = {};
      const accountNumber = typeof item.accountNumber === 'string'
        ? item.accountNumber.trim().toUpperCase()
        : '';

      if (!accountNumber || accountNumber.length > 20) {
        errors.accountNumber = 'accountNumber debe ser 1-20 caracteres';
      } else if (seenAccountNumbers.has(accountNumber)) {
        errors.accountNumber = 'accountNumber duplicado en la importación';
      } else {
        seenAccountNumbers.add(accountNumber);
      }

      if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
        errors.name = 'name es requerido';
      }

      // Accept any non-empty string for type
      if (!item.type || typeof item.type !== 'string' || item.type.trim().length === 0) {
        errors.type = 'type es requerido';
      }

      if (typeof item.currencyId !== 'number' || !Number.isInteger(item.currencyId) || item.currencyId <= 0) {
        errors.currencyId = 'currencyId debe ser un entero positivo';
      }

      if (Object.keys(errors).length > 0) {
        validationErrors.push({ index, accountNumber: accountNumber || `(índice ${index})`, errors });
      }
    });

    return validationErrors;
  }
}

function parsePositiveInt(input: unknown, defaultVal: number): number {
  const v =
    typeof input === 'string'
      ? parseInt(input, 10)
      : typeof input === 'number'
        ? input
        : NaN;
  if (Number.isNaN(v) || v < 1) return defaultVal;
  return Math.floor(v);
}
function parseLimit(input: unknown, defaultVal: number, max: number): number {
  const v = parsePositiveInt(input, defaultVal);
  return Math.min(max, v);
}
function parseBooleanQuery(input: unknown): boolean | undefined {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    const s = input.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  if (typeof input === 'number') {
    if (input === 1) return true;
    if (input === 0) return false;
  }
  return undefined;
}
function parseOptionalPositiveInt(input: unknown): number | undefined {
  const v =
    typeof input === 'string'
      ? parseInt(input, 10)
      : typeof input === 'number'
        ? input
        : NaN;
  if (Number.isNaN(v) || v <= 0) return undefined;
  return Math.floor(v);
}
function isValidAccountTypeString(x: string): boolean {
  // Allowed values as per Prisma enum AccountType
  return (
    x === 'Activo' ||
    x === 'Pasivo' ||
    x === 'Capital' ||
    x === 'Costos' ||
    x === 'Ingresos' ||
    x === 'Gastos'
  );
}