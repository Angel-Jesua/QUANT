/**
 * Account Import Types
 * Type definitions for the Excel import wizard feature
 */

/** Supported AccountType enum values */
export type AccountType = 'Activo' | 'Pasivo' | 'Capital' | 'Costos' | 'Ingresos' | 'Gastos';

/** Available wizard steps */
export type ImportStep = 'upload' | 'mapping' | 'hierarchy' | 'preview' | 'result';

/** Raw row from Excel file before mapping */
export interface ExcelRawRow {
  [key: string]: string | number | undefined;
}

/** Column mapping configuration */
export interface ColumnMapping {
  accountNumber: string;
  name: string;
  type: string;
  currency: string;
  description?: string;
}

/** Currency reference for mapping codes to IDs */
export interface CurrencyOption {
  id: number;
  code: string;
  name: string;
}

/** Single account item for bulk import (sent to backend) */
export interface BulkImportAccountItem {
  accountNumber: string;
  name: string;
  type: string;
  currencyId: number;
  description?: string;
  parentAccountNumber?: string;
  isDetail?: boolean;
  isActive?: boolean;
}

/** Request payload for bulk import endpoint */
export interface BulkImportRequest {
  accounts: BulkImportAccountItem[];
}

/** Result for a single account in bulk import response */
export interface BulkImportItemResult {
  accountNumber: string;
  success: boolean;
  id?: number;
  error?: string;
}

/** Response from bulk import endpoint */
export interface BulkImportResponse {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  results: BulkImportItemResult[];
}

/** Preview row shown in the wizard before submission */
export interface ImportPreviewRow {
  accountNumber: string;
  name: string;
  type: string;
  typeRaw: string;
  currencyId: number;
  currencyCode: string;
  description?: string;
  parentAccountNumber?: string;
  isDetail: boolean;
  level: number;
  hasError: boolean;
  errorMessage?: string;
}

/** Account type normalization mapping */
export const ACCOUNT_TYPE_MAP: Record<string, AccountType> = {
  'activo': 'Activo',
  'activo corriente': 'Activo',
  'activo no corriente': 'Activo',
  'activo fijo': 'Activo',
  'pasivo': 'Pasivo',
  'pasivo corriente': 'Pasivo',
  'pasivo no corriente': 'Pasivo',
  'capital': 'Capital',
  'patrimonio': 'Capital',
  'costos': 'Costos',
  'costo': 'Costos',
  'costo de venta': 'Costos',
  'ingresos': 'Ingresos',
  'ingreso': 'Ingresos',
  'ventas': 'Ingresos',
  'gastos': 'Gastos',
  'gasto': 'Gastos',
  'gastos operativos': 'Gastos',
  'efectivo': 'Activo',
  'banco': 'Activo',
  'bancos': 'Activo',
  'cuentas por cobrar': 'Activo',
  'inventario': 'Activo',
  'cuentas por pagar': 'Pasivo',
  'proveedores': 'Pasivo',
};

/** Available account types for selection */
export const ACCOUNT_TYPE_OPTIONS: AccountType[] = [
  'Activo',
  'Pasivo',
  'Capital',
  'Ingresos',
  'Costos',
  'Gastos',
];

/** Predefined parent account structure */
export interface ParentAccountOption {
  accountNumber: string;
  name: string;
  type: AccountType;
  level: number;
  children?: ParentAccountOption[];
}

/** Predefined parent accounts that should be skipped during import */
export const PREDEFINED_PARENT_ACCOUNTS: ParentAccountOption[] = [
  {
    accountNumber: '100-000-000',
    name: 'ACTIVO',
    type: 'Activo',
    level: 1,
    children: [
      { accountNumber: '110-000-000', name: 'ACTIVO CORRIENTE', type: 'Activo', level: 2 },
      { accountNumber: '120-000-000', name: 'ACTIVO NO CORRIENTE', type: 'Activo', level: 2 },
    ],
  },
  {
    accountNumber: '200-000-000',
    name: 'PASIVO',
    type: 'Pasivo',
    level: 1,
    children: [
      { accountNumber: '210-000-000', name: 'PASIVO CORRIENTE', type: 'Pasivo', level: 2 },
      { accountNumber: '220-000-000', name: 'PASIVO NO CORRIENTE', type: 'Pasivo', level: 2 },
    ],
  },
  {
    accountNumber: '300-000-000',
    name: 'CAPITAL',
    type: 'Capital',
    level: 1,
  },
  {
    accountNumber: '400-000-000',
    name: 'INGRESOS',
    type: 'Ingresos',
    level: 1,
    children: [
      { accountNumber: '420-000-000', name: 'OTROS INGRESOS', type: 'Ingresos', level: 2 },
    ],
  },
  {
    accountNumber: '500-000-000',
    name: 'COSTOS',
    type: 'Costos',
    level: 1,
  },
  {
    accountNumber: '600-000-000',
    name: 'GASTOS',
    type: 'Gastos',
    level: 1,
  },
];

/** Get all predefined parent account numbers (flat list) */
export function getPredefinedAccountNumbers(): Set<string> {
  const numbers = new Set<string>();
  
  function addAccount(account: ParentAccountOption) {
    numbers.add(account.accountNumber);
    if (account.children) {
      account.children.forEach(addAccount);
    }
  }
  
  PREDEFINED_PARENT_ACCOUNTS.forEach(addAccount);
  return numbers;
}

/** Get flattened list of all predefined parent accounts for dropdown */
export function getFlattenedParentAccounts(): ParentAccountOption[] {
  const result: ParentAccountOption[] = [];
  
  function addAccount(account: ParentAccountOption) {
    result.push(account);
    if (account.children) {
      account.children.forEach(addAccount);
    }
  }
  
  PREDEFINED_PARENT_ACCOUNTS.forEach(addAccount);
  return result;
}
