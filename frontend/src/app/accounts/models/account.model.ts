export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  status: boolean;
  description?: string;
  parentId?: string;
  isDetail: boolean;
}

export interface CreateAccountDto extends Omit<Account, 'id'> {}

export interface UpdateAccountDto extends Partial<CreateAccountDto> {}
