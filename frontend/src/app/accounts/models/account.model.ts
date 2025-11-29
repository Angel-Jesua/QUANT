export type AccountCurrency = 'NIO' | 'USD';

export interface Account {
  id: number;
  code: string;                 // Código formato XXX-XXX-XXX
  accountNumber: string;        // Alias (mismo valor que code)
  name: string;
  type: string;                 // Activo, Pasivo, Capital, Ingresos, Gastos, Costos
  detailType?: string;          // Tipo de detalle (Efectivo, Banco, Cliente, etc.)
  currencyId?: number;          // Solo para cuentas de detalle
  currency?: AccountCurrency;   // NIO o USD para cuentas de detalle
  isActive: boolean;
  description?: string;
  parentAccountId?: number;
  isDetail: boolean;            // true = cuenta de detalle, false = cuenta de resumen
  // Extended fields from API response
  currencyRef?: {
    id: number;
    code: string;
    name: string;
  };
}

/** Account with hierarchical structure for tree display */
export interface AccountTreeNode extends Account {
  code: string;                 // Código formato XXX-XXX-XXX
  children: AccountTreeNode[];
  level: number;
  isExpanded: boolean;
  hasChildren: boolean;
}

export interface CreateAccountDto {
  code: string;                 // Código formato XXX-XXX-XXX
  accountNumber?: string;       // Alias opcional
  name: string;
  type: string;
  detailType?: string;
  currencyId?: number;          // Solo para cuentas de detalle
  currency?: AccountCurrency;   // NIO o USD
  description?: string;
  parentAccountId?: number;
  isDetail?: boolean;
  isActive?: boolean;
}

export interface UpdateAccountDto extends Partial<Omit<CreateAccountDto, 'code' | 'accountNumber'>> {}
