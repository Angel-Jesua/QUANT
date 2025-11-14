// Currency module type definitions
// Mirrors Prisma model fields and aligns API response shapes
// ExchangeRate is Prisma.Decimal in storage/service and string in API responses

import { Prisma } from '@prisma/client';

/**
 * Internal Currency entity shape as returned by Prisma (service layer)
 */
export interface ICurrency {
  id: number;
  code: string;               // ISO code (3 chars)
  name: string;               // Display name
  symbol: string;             // e.g., "$", "C$"
  decimalPlaces: number;      // typically 2
  isBaseCurrency: boolean;    // true if system base currency
  exchangeRate: Prisma.Decimal; // stored as Decimal(18,6)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: number;
  updatedById?: number | null;
}

/**
 * API response shape for Currency. exchangeRate is presented as string
 * to avoid leaking Decimal implementation details to clients.
 */
export interface ICurrencyResponse extends Omit<ICurrency, 'exchangeRate'> {
  exchangeRate: string;
}

/**
 * DTO for creating a currency
 */
export interface ICreateCurrency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces?: number;
  isBaseCurrency?: boolean;
  exchangeRate?: number | string; // will be normalized to Decimal
  isActive?: boolean;
}

/**
 * DTO for updating a currency (partial)
 */
export interface IUpdateCurrency {
  code?: string;
  name?: string;
  symbol?: string;
  decimalPlaces?: number;
  isBaseCurrency?: boolean;
  exchangeRate?: number | string; // will be normalized to Decimal
  isActive?: boolean;
}

/**
 * Generic request context collected from middleware for audit logging
 */
export interface IRequestContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: number;
}

// Note: mapping helpers will be implemented in service to convert Prisma rows to ICurrencyResponse

// Create/Update input interfaces required

export interface CreateCurrencyInput {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces?: number;
  isBaseCurrency: boolean;
  exchangeRate: number;
  isActive?: boolean;
}

export interface UpdateCurrencyInput {
  name?: string;
  symbol?: string;
  decimalPlaces?: number;
  isBaseCurrency?: boolean;
  exchangeRate?: number;
  isActive?: boolean;
}