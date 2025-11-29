import { Request, Response } from 'express';
import { ClientService } from './client.service';
import {
  ICreateClient,
  IUpdateClient,
  IRequestContext,
  IClientResponse,
  ClientUpdatableFields,
  ClientCode,
  CurrencyId,
  TaxId,
  Email,
  PhoneE164,
  CountryCode,
  MoneyNonNegative,
} from './client.types';
import { logErrorContext, logAuditError } from '../../utils/error';
import { AuditAction } from '@prisma/client';

type ClientCreateDTO = ICreateClient;
type ClientUpdateDTO = IUpdateClient;
type Client = IClientResponse;
export type AuthenticatedRequest = Request & { userId?: number; user?: { id: number; email?: string; username?: string; role?: string } };

export class ClientController {
  private clientService = new ClientService();

  /**
   * Get all clients with optional pagination and filters.
   * Query params: page, limit, search, isActive, currencyId
   * Returns 200 on success; 500 on unexpected error.
   */
  async getAllClients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId ?? req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const page = parsePositiveInt(req.query.page, 1);
      const pageSize = parseLimit((req.query.pageSize ?? req.query.limit), 20, 100);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const isActiveFilter = parseBooleanQuery(req.query.isActive);
      const currencyIdFilter = parseOptionalPositiveInt(req.query.currencyId);
      const countryCode =
        typeof req.query.countryCode === 'string' ? req.query.countryCode.trim().toUpperCase() : undefined;
      
      const orderByParam = typeof req.query.orderBy === 'string' ? req.query.orderBy : undefined;
      const orderDirParam = typeof req.query.orderDir === 'string' ? req.query.orderDir : undefined;

      const validOrderBy = ['clientCode', 'name', 'createdAt', 'updatedAt', 'country', 'currencyId', 'isActive'];
      const orderBy = validOrderBy.includes(orderByParam as string) ? (orderByParam as any) : undefined;
      const orderDir = orderDirParam === 'asc' || orderDirParam === 'desc' ? orderDirParam : undefined;

      const startDate = typeof req.query.startDate === 'string' ? new Date(req.query.startDate) : undefined;
      const endDate = typeof req.query.endDate === 'string' ? new Date(req.query.endDate) : undefined;

      const serviceFilters: any = {
        search,
        isActive: typeof isActiveFilter === 'boolean' ? isActiveFilter : undefined,
        currencyId: typeof currencyIdFilter === 'number' ? currencyIdFilter : undefined,
        countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined,
        orderBy,
        orderDir,
        startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
        endDate: endDate && !isNaN(endDate.getTime()) ? endDate : undefined,
      };

      const list = await this.clientService.getAllClients(serviceFilters);

      // Enforce ownership
      const owned = list.filter((c) => c.createdById === userId);

      const total = owned.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * pageSize;
      const data = owned.slice(start, start + pageSize);

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
      logErrorContext('client.getAll.error', error, {
        ip: req.ip || (req as any).connection?.remoteAddress,
        ua: req.get('User-Agent'),
      });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'client',
        errorKey: 'fetch_clients_error',
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
   * Get client by ID.
   * Params: id (numeric).
   * Returns: 200 on success; 400 for invalid id; 404 if not found; 500 on unexpected error.
   */
  async getClientById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId ?? req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const { id } = req.params;
      const clientId = Number.parseInt(id, 10);
      if (Number.isNaN(clientId) || clientId <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID inválido' },
        });
        return;
      }

      const client = await this.clientService.getClientById(clientId);
      if (!client || client.createdById !== userId) {
        res.status(404).json({
          success: false,
          error: { message: 'Cliente no encontrado' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: client,
      });
    } catch (error) {
      logErrorContext('client.getById.error', error, { id: req.params.id });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'client',
        entityId: Number.parseInt(req.params.id, 10),
        errorKey: 'fetch_client_error',
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
   * Create a new client.
   * Body: { clientCode, name, currencyId, optional fields... }.
   * Uses req.userId as createdBy.
   * Returns: 201 on success; 400 for validation/duplicate; 500 on unexpected error.
   */
  async createClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId ?? req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const body = req.body as Partial<ClientCreateDTO>;

      const clientCode = typeof body.clientCode === 'string' ? body.clientCode.trim().toUpperCase() : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const currencyIdCandidate = body.currencyId;
      const hasCurrencyId = typeof currencyIdCandidate === 'number';
      const errors: Record<string, string> = {};

      if (!clientCode || clientCode.length > 20) errors.clientCode = 'clientCode debe ser 1-20 caracteres';
      if (!name) errors.name = 'name es requerido';

      if (!hasCurrencyId || !Number.isInteger(currencyIdCandidate!) || currencyIdCandidate! <= 0) {
        errors.currencyId = 'currencyId debe ser un entero positivo';
      }

      // Validación básica de creditLimit
      if (body.creditLimit !== undefined && body.creditLimit !== null) {
        const v = body.creditLimit;
        if (typeof v === 'number') {
          if (v < 0) errors.creditLimit = 'creditLimit debe ser >= 0';
        } else if (typeof v === 'string') {
          const t = v.trim();
          if (t.length === 0) {
            errors.creditLimit = 'creditLimit debe ser numérico';
          } else {
            const num = Number(t);
            if (Number.isNaN(num) || num < 0) errors.creditLimit = 'creditLimit debe ser >= 0';
          }
        } else {
          errors.creditLimit = 'creditLimit debe ser numérico';
        }
      }

      if (Object.keys(errors).length > 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Validación fallida', code: 'VALIDATION_ERROR', details: errors },
        });
        return;
      }

      const requestContext: IRequestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId,
      };

      const payload: ICreateClient = {
        clientCode: clientCode as ClientCode,
        name,
        currencyId: currencyIdCandidate as CurrencyId,
        taxId: typeof body.taxId === 'string' ? (body.taxId.trim() as TaxId) : undefined,
        email: typeof body.email === 'string' ? (body.email.trim() as Email) : undefined,
        phone: typeof body.phone === 'string' ? (body.phone.trim() as PhoneE164) : undefined,
        address: typeof body.address === 'string' ? body.address.trim() : undefined,
        city: typeof body.city === 'string' ? body.city.trim() : undefined,
        country: typeof body.country === 'string' ? (body.country.trim().toUpperCase() as CountryCode) : undefined,
        creditLimit:
          typeof body.creditLimit === 'number'
            ? (body.creditLimit as MoneyNonNegative)
            : body.creditLimit,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      };

      const created = await this.clientService.createClient(payload, requestContext);

      res.set('Location', `/api/clients/${created.id}`);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      const e = error as Error;
      const safeBody = req?.body as Partial<ICreateClient> | undefined;

      if (e) {
        if (e.message === 'AUTH_REQUIRED') {
          res.status(401).json({
            success: false,
            error: { message: 'Unauthorized', code: e.message },
          });
          return;
        }
        if (e.message === 'DUPLICATE_CLIENT_CODE' || e.message === 'DUPLICATE_TAX_ID') {
          res.status(409).json({
            success: false,
            error: { message: 'Conflict', code: e.message },
          });
          return;
        }
        const validationCodes = new Set([
          'CLIENT_CODE_INVALID',
          'NAME_REQUIRED',
          'INVALID_CURRENCY',
          'CREDIT_LIMIT_REQUIRED',
          'CREDIT_LIMIT_NEGATIVE',
        ]);
        if (validationCodes.has(e.message)) {
          res.status(400).json({
            success: false,
            error: { message: 'Validation error', code: e.message },
          });
          return;
        }
      }

      logErrorContext('client.create.error', error, { clientCode: safeBody?.clientCode, name: safeBody?.name });
      await logAuditError({
        action: AuditAction.create,
        entityType: 'client',
        errorKey: 'create_client_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        newData: { clientCode: safeBody?.clientCode, name: safeBody?.name },
      });
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' },
      });
    }
  }

  /**
   * Update client.
   * Params: id.
   * Body: Partial fields with validation. Unknown props rejected.
   * Returns: 200 success; 400 validation/unknown props; 404 not found; 500 unexpected.
   */
  async updateClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId ?? req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
        return;
      }

      const idParam = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(idParam) || idParam <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID inválido' },
        });
        return;
      }

      // Ownership check
      const current = await this.clientService.getClientById(idParam);
      if (!current || current.createdById !== userId) {
        res.status(404).json({
          success: false,
          error: { message: 'Cliente no encontrado' },
        });
        return;
      }

      const raw = req.body as Record<string, unknown>;
      const allowed = new Set([
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
      const unknownProps = Object.keys(raw).filter((k) => !allowed.has(k));
      if (unknownProps.length > 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Propiedades no permitidas', code: 'UNKNOWN_PROPERTIES', details: unknownProps },
        });
        return;
      }

      const body = raw as Partial<ClientUpdateDTO>;

      const normalized: Partial<ClientUpdatableFields> & { clientCode?: ClientCode } = {};
      if (typeof body.clientCode === 'string') {
        const v = body.clientCode.trim().toUpperCase();
        if (!v || v.length > 20) {
          res.status(400).json({
            success: false,
            error: { message: 'clientCode debe ser 1-20 caracteres', code: 'VALIDATION_ERROR' },
          });
          return;
        }
        normalized.clientCode = v as ClientCode;
      }
      if (typeof body.taxId === 'string') normalized.taxId = body.taxId.trim() as TaxId;
      if (body.taxId === null) normalized.taxId = null;
      if (typeof body.name === 'string') normalized.name = body.name.trim();
      if (typeof body.email === 'string') normalized.email = body.email.trim() as Email;
      if (body.email === null) normalized.email = null;
      if (typeof body.phone === 'string') normalized.phone = body.phone.trim() as PhoneE164;
      if (body.phone === null) normalized.phone = null;
      if (typeof body.address === 'string') normalized.address = body.address.trim();
      if (body.address === null) normalized.address = null;
      if (typeof body.city === 'string') normalized.city = body.city.trim();
      if (body.city === null) normalized.city = null;
      if (typeof body.country === 'string') normalized.country = body.country.trim().toUpperCase() as CountryCode;
      if (typeof body.isActive === 'boolean') normalized.isActive = body.isActive;

      if (body.creditLimit !== undefined) {
        const v = body.creditLimit;
        if (typeof v === 'number') {
          if (v < 0) {
            res.status(400).json({
              success: false,
              error: { message: 'creditLimit debe ser >= 0', code: 'VALIDATION_ERROR' },
            });
            return;
          }
          normalized.creditLimit = v as MoneyNonNegative;
        } else if (typeof v === 'string') {
          const t = v.trim();
          if (t.length === 0) {
            res.status(400).json({
              success: false,
              error: { message: 'creditLimit debe ser numérico', code: 'VALIDATION_ERROR' },
            });
            return;
          }
          const num = Number(t);
          if (Number.isNaN(num) || num < 0) {
            res.status(400).json({
              success: false,
              error: { message: 'creditLimit debe ser >= 0', code: 'VALIDATION_ERROR' },
            });
            return;
          }
          normalized.creditLimit = t;
        } else {
          res.status(400).json({
            success: false,
            error: { message: 'creditLimit debe ser numérico', code: 'VALIDATION_ERROR' },
          });
          return;
        }
      }

      if (typeof body.currencyId === 'number') {
        if (!Number.isInteger(body.currencyId) || body.currencyId <= 0) {
          res.status(400).json({
            success: false,
            error: { message: 'currencyId debe ser un entero positivo', code: 'VALIDATION_ERROR' },
          });
          return;
        }
        normalized.currencyId = body.currencyId as CurrencyId;
      }

      const requestContext: IRequestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId,
      };

      const updated = await this.clientService.updateClient(idParam, normalized as IUpdateClient, requestContext);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { message: 'Cliente no encontrado' },
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
        if (e.message === 'DUPLICATE_CLIENT_CODE' || e.message === 'DUPLICATE_TAX_ID') {
          res.status(409).json({
            success: false,
            error: { message: 'Conflict', code: e.message },
          });
          return;
        }
        const known400 = new Set([
          'CLIENT_CODE_INVALID',
          'NAME_REQUIRED',
          'INVALID_CURRENCY',
          'CREDIT_LIMIT_REQUIRED',
          'CREDIT_LIMIT_NEGATIVE',
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
      logErrorContext('client.update.error', error, { id: idParam });
      await logAuditError({
        action: AuditAction.update,
        entityType: 'client',
        entityId: Number.isNaN(idParam) ? undefined : idParam,
        errorKey: 'update_client_error',
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
   * Delete client (soft delete: mark inactive).
   * Params: id.
   * Returns: 200 success; 404 when not found; 400 invalid id; 500 unexpected error.
   */
  async deleteClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId ?? req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
        return;
      }

      const idParam = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(idParam) || idParam <= 0) {
        res.status(400).json({
          success: false,
          error: { message: 'ID inválido' },
        });
        return;
      }

      // Ownership check
      const current = await this.clientService.getClientById(idParam);
      if (!current || current.createdById !== userId) {
        res.status(404).json({
          success: false,
          error: { message: 'Cliente no encontrado' },
        });
        return;
      }

      const requestContext: IRequestContext = {
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId,
      };

      const success = await this.clientService.deleteClient(idParam, requestContext);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { message: 'Cliente no encontrado' },
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      const idParam = Number.parseInt(req.params.id, 10);
      logErrorContext('client.delete.error', error, { id: idParam });
      await logAuditError({
        action: AuditAction.delete,
        entityType: 'client',
        entityId: Number.isNaN(idParam) ? undefined : idParam,
        errorKey: 'delete_client_error',
        ipAddress: req.ip || (req as any).connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' },
      });
    }
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

export class ClientVerifyController {
  private clientService = new ClientService();

  /**
   * Verify user password and get client details with decrypted email/phone.
   * POST /clients/:id/verify-details
   * Body: { password: string }
   */
  async verifyAndGetDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId ?? req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const clientId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(clientId) || clientId <= 0) {
        res.status(400).json({ success: false, message: 'ID de cliente inválido' });
        return;
      }

      const { password } = req.body;
      if (!password || typeof password !== 'string') {
        res.status(400).json({ success: false, message: 'Contraseña requerida' });
        return;
      }

      const result = await this.clientService.verifyAndGetClientDetails(
        userId,
        password,
        clientId,
        {
          ipAddress: req.ip || (req as any).connection?.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      );

      res.status(result.statusCode || (result.success ? 200 : 400)).json(result);
    } catch (error) {
      console.error('Error in verifyAndGetDetails:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
}