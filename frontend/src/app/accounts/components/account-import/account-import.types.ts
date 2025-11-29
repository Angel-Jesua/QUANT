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
  parentAccount?: string;  // Nueva columna para Cuenta Padre
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
  accountNumber: string;        // Código formato XXX-XXX-XXX (se usa como code)
  name: string;
  type: string;
  detailType?: string;          // Tipo de detalle opcional
  currencyId?: number;          // Solo requerido para cuentas de detalle
  currency?: 'NIO' | 'USD';     // Moneda para cuentas de detalle
  description?: string;
  parentAccountNumber?: string;
  isDetail?: boolean;
  isActive?: boolean;
}

/** Request payload for bulk import endpoint */
export interface BulkImportRequest {
  accounts: BulkImportAccountItem[];
  /** If true, existing accounts will be updated instead of returning an error */
  updateExisting?: boolean;
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
  /** Number of accounts updated (when updateExisting is true) */
  updatedCount?: number;
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

/** Account type normalization mapping - comprehensive for IURIS CONSULTUS chart of accounts */
export const ACCOUNT_TYPE_MAP: Record<string, AccountType> = {
  // ACTIVO types
  'activo': 'Activo',
  'activos': 'Activo',
  'activo corriente': 'Activo',
  'activos corrientes': 'Activo',
  'activo no corriente': 'Activo',
  'activos no corrientes': 'Activo',
  'activo fijo': 'Activo',
  'efectivo': 'Activo',
  'efectivo y equivalente de efectivo': 'Activo',
  'banco': 'Activo',
  'bancos': 'Activo',
  'bancos moneda nacional': 'Activo',
  'bancos moneda extranjera': 'Activo',
  'cuentas por cobrar': 'Activo',
  'cuentas por cobrar clientes': 'Activo',
  'inventario': 'Activo',
  'pagos anticipados': 'Activo',
  'depreciacion acumulada': 'Activo',
  'propiedad planta y equipo': 'Activo',
  'mobiliario y equipo de oficina': 'Activo',
  'suejto a rendicion de cuenta': 'Activo',
  'sujeto a rendicion de cuenta': 'Activo',
  
  // PASIVO types
  'pasivo': 'Pasivo',
  'pasivos': 'Pasivo',
  'pasivo corriente': 'Pasivo',
  'pasivos corrientes': 'Pasivo',
  'pasivo no corriente': 'Pasivo',
  'pasivo no corriente ': 'Pasivo',
  'pasivos no corrientes': 'Pasivo',
  'cuentas por pagar': 'Pasivo',
  'cuentas por pagar proveedores': 'Pasivo',
  'cuentas por pagar proveedores ': 'Pasivo',
  'cuentas por pagar a socios': 'Pasivo',
  'cuentas por pagar servicios publicos': 'Pasivo',
  'otras cuentas por pagar': 'Pasivo',
  'proveedores': 'Pasivo',
  'retenciones': 'Pasivo',
  'retenciones a pagar': 'Pasivo',
  'impuestos a pagar': 'Pasivo',
  'provisiones': 'Pasivo',
  'provisiones ': 'Pasivo',
  'gastos acumulados por pagar': 'Pasivo',
  'anticipos clientes': 'Pasivo',
  'anticipo de gastos': 'Pasivo',
  'prestamos': 'Pasivo',
  'prestamos y documentos a pagar largo plazo': 'Pasivo',
  
  // CAPITAL types
  'capital': 'Capital',
  'patrimonio': 'Capital',
  'capital contable': 'Capital',
  'capital social': 'Capital',
  'capital social autorizado': 'Capital',
  'capital social pagado': 'Capital',
  'utilidades': 'Capital',
  'utilidades ': 'Capital',
  
  // INGRESOS types
  'ingresos': 'Ingresos',
  'ingreso': 'Ingresos',
  'ventas': 'Ingresos',
  'otros ingresos': 'Ingresos',
  'ingresos por servicios': 'Ingresos',
  'ingresos por prestacion de servicios': 'Ingresos',
  'ingresos por servicios nuevas tecnologias': 'Ingresos',
  'ingresos por servicios/ administracion-contable': 'Ingresos',
  'ingresos por servicios/corporativo': 'Ingresos',
  'ingresos por servicios/litigio': 'Ingresos',
  'ingresos por servicios/tributario': 'Ingresos',
  'productos financieros': 'Ingresos',
  'descuentos': 'Ingresos',
  'descuentos por servicios': 'Ingresos',
  'fee': 'Ingresos',
  
  // COSTOS types
  'costos': 'Costos',
  'costo': 'Costos',
  'costo de venta': 'Costos',
  'costo de ventas': 'Costos',
  'costos de actividades economicas': 'Costos',
  'servicios': 'Costos',
  
  // GASTOS types
  'gastos': 'Gastos',
  'gasto': 'Gastos',
  'gastos operativos': 'Gastos',
  'gastos administrativos': 'Gastos',
  'gastos de operacion': 'Gastos',
  'gastos generales': 'Gastos',
  'gastos financieros': 'Gastos',
  'gastos no deducibles': 'Gastos',
  'gastos de viajes': 'Gastos',
  'gastos por servicios legales': 'Gastos',
  'gastos publicitarios': 'Gastos',
  'gastos de socios': 'Gastos',
  'gasto por depreciacion': 'Gastos',
  'gasto por depreciacion ': 'Gastos',
  'otros gastos': 'Gastos',
  'materiales y suministros': 'Gastos',
  'licencias': 'Gastos',
  'seguros': 'Gastos',
  'pagos y beneficios a empleados': 'Gastos',
  'obligaciones a empleados': 'Gastos',
  'impuestos de planillas': 'Gastos',
  'impuestos municipales': 'Gastos',
  'servicios basicos y otros': 'Gastos',
  'mantenimiento de instalaciones y equipos': 'Gastos',
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
    children: [
      { accountNumber: '310-000-000', name: 'CAPITAL SOCIAL', type: 'Capital', level: 2 },
      { accountNumber: '320-000-000', name: 'UTILIDADES', type: 'Capital', level: 2 },
    ],
  },
  {
    accountNumber: '400-000-000',
    name: 'INGRESOS',
    type: 'Ingresos',
    level: 1,
    children: [
      { accountNumber: '410-000-000', name: 'INGRESOS POR SERVICIOS', type: 'Ingresos', level: 2 },
      { accountNumber: '420-000-000', name: 'OTROS INGRESOS', type: 'Ingresos', level: 2 },
    ],
  },
  {
    accountNumber: '500-000-000',
    name: 'COSTOS',
    type: 'Costos',
    level: 1,
    children: [
      { accountNumber: '510-000-000', name: 'COSTOS DE ACTIVIDADES ECONOMICAS', type: 'Costos', level: 2 },
    ],
  },
  {
    accountNumber: '600-000-000',
    name: 'GASTOS',
    type: 'Gastos',
    level: 1,
    children: [
      { accountNumber: '610-000-000', name: 'GASTOS GENERALES', type: 'Gastos', level: 2 },
      { accountNumber: '620-000-000', name: 'GASTOS ADMINISTRATIVOS', type: 'Gastos', level: 2 },
    ],
  },
];

/**
 * Mapping of common parent account names to their codes.
 * Used to resolve "Cuenta Padre" column values from Excel.
 */
export const PARENT_NAME_TO_CODE_MAP: Record<string, string> = {
  // Activo
  'activo': '100-000-000',
  'activos': '100-000-000',
  'activo corriente': '110-000-000',
  'activos corrientes': '110-000-000',
  'activo no corriente': '120-000-000',
  'activos no corrientes': '120-000-000',
  'activo fijo': '120-000-000',
  'activos fijos': '120-000-000',
  // Pasivo
  'pasivo': '200-000-000',
  'pasivos': '200-000-000',
  'pasivo corriente': '210-000-000',
  'pasivos corrientes': '210-000-000',
  'pasivo no corriente': '220-000-000',
  'pasivos no corrientes': '220-000-000',
  'pasivo no corriente ': '220-000-000', // Con espacio extra
  // Capital
  'capital': '300-000-000',
  'patrimonio': '300-000-000',
  'capital social': '310-000-000',
  'utilidades': '320-000-000',
  'utilidades ': '320-000-000', // Con espacio extra
  // Ingresos
  'ingresos': '400-000-000',
  'ingreso': '400-000-000',
  'ingresos por servicios': '410-000-000',
  'otros ingresos': '420-000-000',
  // Costos
  'costos': '500-000-000',
  'costo': '500-000-000',
  'costos de actividades economicas': '510-000-000',
  // Gastos
  'gastos': '600-000-000',
  'gasto': '600-000-000',
  'gastos generales': '610-000-000',
  'gastos administrativos': '620-000-000',
};

/**
 * Resolve a parent account name to its code.
 * Handles common variations and normalizations.
 */
export function resolveParentNameToCode(parentName: string): string | undefined {
  if (!parentName) return undefined;
  
  const normalized = parentName.trim().toLowerCase();
  
  // Direct lookup
  if (PARENT_NAME_TO_CODE_MAP[normalized]) {
    return PARENT_NAME_TO_CODE_MAP[normalized];
  }
  
  // Try without trailing spaces
  const withoutTrailingSpaces = normalized.replace(/\s+$/, '');
  if (PARENT_NAME_TO_CODE_MAP[withoutTrailingSpaces]) {
    return PARENT_NAME_TO_CODE_MAP[withoutTrailingSpaces];
  }
  
  // Try partial matches for common patterns
  if (normalized.includes('activo corriente') && !normalized.includes('no corriente')) {
    return '110-000-000';
  }
  if (normalized.includes('activo no corriente') || normalized.includes('activo fijo')) {
    return '120-000-000';
  }
  if (normalized.includes('activo')) {
    return '100-000-000';
  }
  if (normalized.includes('pasivo corriente') && !normalized.includes('no corriente')) {
    return '210-000-000';
  }
  if (normalized.includes('pasivo no corriente')) {
    return '220-000-000';
  }
  if (normalized.includes('pasivo')) {
    return '200-000-000';
  }
  if (normalized.includes('capital') || normalized.includes('patrimonio')) {
    return '300-000-000';
  }
  if (normalized.includes('otros ingresos')) {
    return '420-000-000';
  }
  if (normalized.includes('ingreso')) {
    return '400-000-000';
  }
  if (normalized.includes('costo')) {
    return '500-000-000';
  }
  if (normalized.includes('gasto')) {
    return '600-000-000';
  }
  
  return undefined;
}

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
