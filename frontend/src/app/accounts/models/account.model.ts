export interface Account {
  id: number;
  accountNumber: string;
  name: string;
  type: string;
  currencyId: number;
  isActive: boolean;
  description?: string;
  parentAccountId?: number;
  isDetail: boolean;
  // Extended fields from API response
  currency?: {
    id: number;
    code: string;
    name: string;
  };
}

/** Account with hierarchical structure for tree display */
export interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
  level: number;
  isExpanded: boolean;
  hasChildren: boolean;
}

export interface CreateAccountDto {
  accountNumber: string;
  name: string;
  type: string;
  currencyId: number;
  description?: string;
  parentAccountId?: number;
  isDetail?: boolean;
  isActive?: boolean;
}

export interface UpdateAccountDto extends Partial<CreateAccountDto> {}
