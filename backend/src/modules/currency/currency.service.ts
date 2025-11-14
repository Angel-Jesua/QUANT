import { PrismaClient, AuditAction, Prisma } from '@prisma/client';
import {
  ICreateCurrency,
  IUpdateCurrency,
  ICurrencyResponse,
  IRequestContext,
} from './currency.types';

const prisma = new PrismaClient();

const DECIMAL_ONE = new Prisma.Decimal(1);

function toDecimal(value: number | string): Prisma.Decimal {
  if (typeof value === 'string') {
    const v = value.trim();
    if (v.length === 0) {
      throw new Error('EXCHANGE_RATE_REQUIRED');
    }
    return new Prisma.Decimal(v);
  }
  return new Prisma.Decimal(value);
}

function isPositive(dec: Prisma.Decimal): boolean {
  return dec.toNumber() > 0;
}

function requireBaseRateEqualsOne(rate: Prisma.Decimal): void {
  if (!rate.equals(DECIMAL_ONE)) {
    throw new Error('BASE_RATE_NOT_ONE');
  }
}

function requireNonBaseRatePositive(rate: Prisma.Decimal): void {
  if (!(rate.toNumber() > 0)) {
    throw new Error('RATE_MUST_BE_GT_ZERO');
  }
}

function mapCurrency(row: {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBaseCurrency: boolean;
  exchangeRate: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: number;
  updatedById: number | null;
}): ICurrencyResponse {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    decimalPlaces: row.decimalPlaces,
    isBaseCurrency: row.isBaseCurrency,
    exchangeRate: row.exchangeRate?.toString(),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    updatedById: row.updatedById ?? undefined,
  };
}

export class CurrencyService {
  async getAllCurrencies(): Promise<ICurrencyResponse[]> {
    const currencies = await prisma.currency.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        symbol: true,
        decimalPlaces: true,
        isBaseCurrency: true,
        exchangeRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        updatedById: true,
      },
      orderBy: { code: 'asc' },
    });

    return currencies.map(mapCurrency);
  }

  async getCurrencyById(id: number): Promise<ICurrencyResponse | null> {
    const currency = await prisma.currency.findUnique({
      where: { id },
      include: {
        createdBy: true,
        updatedBy: true,
      },
    });

    return currency ? mapCurrency(currency as any) : null;
  }

  async createCurrency(
    data: ICreateCurrency,
    requestContext?: IRequestContext
  ): Promise<ICurrencyResponse> {
    if (!requestContext?.userId) {
      throw new Error('AUTH_REQUIRED');
    }

    const code = (data.code ?? '').trim().toUpperCase();
    const name = (data.name ?? '').trim();
    const symbol = (data.symbol ?? '').trim();
    const decimalPlaces =
      typeof data.decimalPlaces === 'number' ? data.decimalPlaces : 2;
    const isBaseCurrency =
      typeof data.isBaseCurrency === 'boolean' ? data.isBaseCurrency : false;
    const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;

    if (data.exchangeRate === undefined || data.exchangeRate === null) {
      throw new Error('EXCHANGE_RATE_REQUIRED');
    }
    const exchangeRateDecimal = toDecimal(data.exchangeRate);

    // Business validations
    if (isBaseCurrency) {
      requireBaseRateEqualsOne(exchangeRateDecimal);
    } else {
      requireNonBaseRatePositive(exchangeRateDecimal);
    }

    // Pre-uniqueness check to provide a friendlier error (still race-safe via catch)
    const existing = await prisma.currency.findFirst({ where: { code } });
    if (existing) {
      throw new Error('DUPLICATE_CODE');
    }

    try {
      let created: any;

      if (isBaseCurrency && isActive) {
        created = await prisma.$transaction(async (tx) => {
          const otherBase = await tx.currency.findFirst({
            where: { isBaseCurrency: true, isActive: true },
            select: { id: true },
          });
          if (otherBase) {
            throw new Error('BASE_CONFLICT');
          }

          return tx.currency.create({
            data: {
              code,
              name,
              symbol,
              decimalPlaces,
              isBaseCurrency,
              exchangeRate: exchangeRateDecimal,
              isActive,
              createdById: requestContext.userId as number,
            },
            select: {
              id: true,
              code: true,
              name: true,
              symbol: true,
              decimalPlaces: true,
              isBaseCurrency: true,
              exchangeRate: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              createdById: true,
              updatedById: true,
            },
          });
        });
      } else {
        created = await prisma.currency.create({
          data: {
            code,
            name,
            symbol,
            decimalPlaces,
            isBaseCurrency,
            exchangeRate: exchangeRateDecimal,
            isActive,
            createdById: requestContext.userId as number,
          },
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
            decimalPlaces: true,
            isBaseCurrency: true,
            exchangeRate: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            createdById: true,
            updatedById: true,
          },
        });
      }

      // Audit success
      await prisma.userAuditLog.create({
        data: {
          userId: requestContext.userId,
          action: AuditAction.create,
          entityType: 'currency',
          entityId: created.id,
          newData: {
            id: created.id,
            code: created.code,
            name: created.name,
            symbol: created.symbol,
            decimalPlaces: created.decimalPlaces,
            isBaseCurrency: created.isBaseCurrency,
            exchangeRate: created.exchangeRate?.toString(),
            isActive: created.isActive,
          },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          success: true,
          performedAt: new Date(),
        },
      });

      return mapCurrency(created);
    } catch (error: any) {
      // Map Prisma unique constraint error
      if (error?.code === 'P2002') {
        throw new Error('DUPLICATE_CODE');
      }
      // Audit failure
      try {
        await prisma.userAuditLog.create({
          data: {
            userId: requestContext.userId,
            action: AuditAction.create,
            entityType: 'currency',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            success: false,
            performedAt: new Date(),
          },
        });
      } catch {
        // ignore audit error
      }
      throw error;
    }
  }

  async updateCurrency(
    id: number,
    data: IUpdateCurrency,
    requestContext?: IRequestContext
  ): Promise<ICurrencyResponse | null> {
    // Load current state
    const current = await prisma.currency.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        symbol: true,
        decimalPlaces: true,
        isBaseCurrency: true,
        exchangeRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        updatedById: true,
      },
    });
    if (!current) {
      return null;
    }

    // Normalize incoming changes
    const updateData: any = {};
    if (typeof data.code === 'string') updateData.code = data.code.trim().toUpperCase();
    if (typeof data.name === 'string') updateData.name = data.name.trim();
    if (typeof data.symbol === 'string') updateData.symbol = data.symbol.trim();
    if (typeof data.decimalPlaces === 'number') updateData.decimalPlaces = data.decimalPlaces;
    if (typeof data.isBaseCurrency === 'boolean') updateData.isBaseCurrency = data.isBaseCurrency;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;

    let exchangeRateDecimal: Prisma.Decimal | undefined;
    if (data.exchangeRate !== undefined && data.exchangeRate !== null) {
      exchangeRateDecimal = toDecimal(data.exchangeRate);
      updateData.exchangeRate = exchangeRateDecimal;
    }
    if (requestContext?.userId) {
      updateData.updatedById = requestContext.userId;
    }

    // Determine post-update state for validations
    const isBaseAfter =
      typeof updateData.isBaseCurrency === 'boolean'
        ? updateData.isBaseCurrency
        : current.isBaseCurrency;
    const isActiveAfter =
      typeof updateData.isActive === 'boolean'
        ? updateData.isActive
        : current.isActive;
    const rateAfter =
      exchangeRateDecimal !== undefined ? exchangeRateDecimal : current.exchangeRate;

    // Business validations
    if (isBaseAfter) {
      // If the currency will be base, rate must be exactly 1
      requireBaseRateEqualsOne(rateAfter);
    } else {
      // Non-base: if changing the rate, it must be > 0
      if (exchangeRateDecimal !== undefined) {
        requireNonBaseRatePositive(exchangeRateDecimal);
      }
    }

    // Concurrency-sensitive cases:
    const togglingToBaseActive =
      !current.isBaseCurrency && isBaseAfter === true && isActiveAfter === true;
    const activatingBaseAgain =
      current.isBaseCurrency === true &&
      current.isActive === false &&
      isActiveAfter === true;
    const changingRateOnBase =
      current.isBaseCurrency === true && exchangeRateDecimal !== undefined;

    try {
      let updated: any;

      if (togglingToBaseActive || activatingBaseAgain || changingRateOnBase) {
        updated = await prisma.$transaction(async (tx) => {
          if (togglingToBaseActive || activatingBaseAgain) {
            const otherBase = await tx.currency.findFirst({
              where: { isBaseCurrency: true, isActive: true, id: { not: id } },
              select: { id: true },
            });
            if (otherBase) {
              throw new Error('BASE_CONFLICT');
            }
          }

          return tx.currency.update({
            where: { id },
            data: updateData,
            select: {
              id: true,
              code: true,
              name: true,
              symbol: true,
              decimalPlaces: true,
              isBaseCurrency: true,
              exchangeRate: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              createdById: true,
              updatedById: true,
            },
          });
        });
      } else {
        updated = await prisma.currency.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
            decimalPlaces: true,
            isBaseCurrency: true,
            exchangeRate: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            createdById: true,
            updatedById: true,
          },
        });
      }

      // Audit success
      await prisma.userAuditLog.create({
        data: {
          userId: requestContext?.userId,
          action: AuditAction.update,
          entityType: 'currency',
          entityId: updated.id,
          newData: {
            id: updated.id,
            code: updated.code,
            name: updated.name,
            symbol: updated.symbol,
            decimalPlaces: updated.decimalPlaces,
            isBaseCurrency: updated.isBaseCurrency,
            exchangeRate: updated.exchangeRate?.toString(),
            isActive: updated.isActive,
          },
          ipAddress: requestContext?.ipAddress,
          userAgent: requestContext?.userAgent,
          success: true,
          performedAt: new Date(),
        },
      });

      return mapCurrency(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new Error('DUPLICATE_CODE');
      }
      if (error?.code === 'P2025') {
        return null;
      }
      // Audit failure
      try {
        await prisma.userAuditLog.create({
          data: {
            userId: requestContext?.userId,
            action: AuditAction.update,
            entityType: 'currency',
            entityId: id,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            ipAddress: requestContext?.ipAddress,
            userAgent: requestContext?.userAgent,
            success: false,
            performedAt: new Date(),
          },
        });
      } catch {
        // ignore
      }
      throw error;
    }
  }

  async deleteCurrency(
    id: number,
    requestContext?: IRequestContext
  ): Promise<boolean> {
    try {
      // Ensure it exists
      const exists = await prisma.currency.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) {
        return false;
      }

      // Check references
      const [clientsCount, accountsCount] = await Promise.all([
        prisma.client.count({ where: { currencyId: id } }),
        prisma.account.count({ where: { currencyId: id } }),
      ]);

      if ((clientsCount + accountsCount) > 0) {
        // Soft delete: mark inactive only (do not change updatedById)
        await prisma.currency.update({
          where: { id },
          data: {
            isActive: false,
          },
        });

        await prisma.userAuditLog.create({
          data: {
            userId: requestContext?.userId,
            action: AuditAction.delete,
            entityType: 'currency',
            entityId: id,
            ipAddress: requestContext?.ipAddress,
            userAgent: requestContext?.userAgent,
            success: true,
            performedAt: new Date(),
          },
        });

        return true;
      }

      // No references: hard delete
      await prisma.currency.delete({
        where: { id },
      });

      await prisma.userAuditLog.create({
        data: {
          userId: requestContext?.userId,
          action: AuditAction.delete,
          entityType: 'currency',
          entityId: id,
          ipAddress: requestContext?.ipAddress,
          userAgent: requestContext?.userAgent,
          success: true,
          performedAt: new Date(),
        },
      });

      return true;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        return false;
      }
      try {
        await prisma.userAuditLog.create({
          data: {
            userId: requestContext?.userId,
            action: AuditAction.delete,
            entityType: 'currency',
            entityId: id,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            ipAddress: requestContext?.ipAddress,
            userAgent: requestContext?.userAgent,
            success: false,
            performedAt: new Date(),
          },
        });
      } catch {
        // ignore
      }
      throw error;
    }
  }
}