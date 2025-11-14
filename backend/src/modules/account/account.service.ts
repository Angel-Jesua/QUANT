import { PrismaClient, AuditAction, AccountType, Prisma } from '@prisma/client';
import {
  ICreateAccount,
  IUpdateAccount,
  IAccountResponse,
  IRequestContext,
} from './account.types';

const prisma = new PrismaClient();

// CK_nature_by_type business rules (Spanish AccountType mapping)
const PARENT_TYPES: ReadonlyArray<AccountType> = [
  AccountType.Activo,
  AccountType.Pasivo,
  AccountType.Capital,
  AccountType.Ingresos,
  AccountType.Gastos,
];

const LEAF_ONLY_TYPES: ReadonlyArray<AccountType> = [
  AccountType.Costos,
];

const ALLOWED_CHILDREN_BY_PARENT: Readonly<Record<AccountType, ReadonlyArray<AccountType>>> = {
  [AccountType.Activo]: [AccountType.Activo],
  [AccountType.Pasivo]: [AccountType.Pasivo],
  [AccountType.Capital]: [AccountType.Capital],
  [AccountType.Ingresos]: [AccountType.Ingresos],
  [AccountType.Gastos]: [AccountType.Gastos, AccountType.Costos],
  [AccountType.Costos]: [],
};

const ACCOUNT_INCLUDE: Prisma.AccountInclude = {
  parentAccount: true,
  currency: true,
  childAccounts: true,
  createdBy: true,
  updatedBy: true,
};

function mapAccount(row: {
  id: number;
  accountNumber: string;
  name: string;
  description: string | null;
  type: AccountType;
  currencyId: number;
  parentAccountId: number | null;
  isDetail: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: number;
  updatedById: number | null;
}): IAccountResponse {
  return {
    id: row.id,
    accountNumber: row.accountNumber,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    currencyId: row.currencyId,
    parentAccountId: row.parentAccountId ?? undefined,
    isDetail: row.isDetail,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    updatedById: row.updatedById ?? undefined,
  };
}

async function ensureCurrencyExists(currencyId: number): Promise<void> {
  const currency = await prisma.currency.findUnique({
    where: { id: currencyId },
    select: { id: true },
  });
  if (!currency) throw new Error('INVALID_CURRENCY');
}

async function ensureParentExists(parentId: number): Promise<void> {
  const parent = await prisma.account.findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (!parent) throw new Error('INVALID_PARENT');
}

async function ensureUniqueAccountNumber(accountNumber: string): Promise<void> {
  const existing = await prisma.account.findFirst({
    where: { accountNumber },
    select: { id: true },
  });
  if (existing) throw new Error('DUPLICATE_ACCOUNT_NUMBER');
}

function isValidAccountType(value: unknown): value is AccountType {
  return typeof value === 'string' && (Object.values(AccountType) as string[]).includes(value);
}

export class AccountService {
  // Centralized structural/type validation equivalent to CK_nature_by_type
  private async validateAccountTypeAndStructure(params: {
    type: AccountType;
    parentAccountId: number | null;
    accountIdToUpdate?: number; // optional for update validations
  }): Promise<void> {
    const { type, parentAccountId, accountIdToUpdate } = params;

    // Validate allowed type
    const ALL_TYPES = Object.values(AccountType) as AccountType[];
    if (!ALL_TYPES.includes(type)) {
      throw new Error('INVALID_ACCOUNT_TYPE');
    }

    // When a parent is specified, validate existence and compatibility
    if (parentAccountId) {
      const parentRow: { id: number; type: AccountType } | null = await prisma.account.findUnique({
        where: { id: parentAccountId },
        select: { id: true, type: true },
      });
      if (!parentRow) {
        throw new Error('INVALID_PARENT');
      }
      if (!PARENT_TYPES.includes(parentRow.type)) {
        // Only Activo, Pasivo, Capital, Ingresos, Gastos can have children
        throw new Error('INVALID_PARENT');
      }
      const allowedChildren = ALLOWED_CHILDREN_BY_PARENT[parentRow.type] ?? [];
      if (!allowedChildren.includes(type)) {
        // Child type not compatible with parent type
        throw new Error('INVALID_PARENT');
      }
    }

    // Update-specific validations
    if (accountIdToUpdate) {
      const current = await prisma.account.findUnique({
        where: { id: accountIdToUpdate },
        select: { id: true, type: true, parentAccountId: true },
      });
      if (!current) {
        // Caller handles 404; nothing else to validate here
        return;
      }

      // If the account currently has children, prevent changing to a LEAF_ONLY type
      const childrenCount = await prisma.account.count({
        where: { parentAccountId: accountIdToUpdate, isActive: true },
      });
      if (childrenCount > 0 && LEAF_ONLY_TYPES.includes(type)) {
        throw new Error('INVALID_ACCOUNT_TYPE');
      }

      // If type is changing, ensure all existing children remain compatible with the new parent type
      if (type !== current.type) {
        const children = await prisma.account.findMany({
          where: { parentAccountId: accountIdToUpdate, isActive: true },
          select: { id: true, type: true },
        });
        const allowedChildrenForNewParent = ALLOWED_CHILDREN_BY_PARENT[type] ?? [];
        for (const child of children) {
          if (!allowedChildrenForNewParent.includes(child.type)) {
            throw new Error('INVALID_ACCOUNT_TYPE');
          }
        }
      }

      // If re-parenting, ensure no cycles are introduced (new parent cannot be a descendant of the account)
      if (parentAccountId !== null && parentAccountId !== current.parentAccountId) {
        let cursor: number | null = parentAccountId;
        while (cursor !== null) {
          if (cursor === accountIdToUpdate) {
            throw new Error('INVALID_PARENT');
          }
          const parentLink: { parentAccountId: number | null } | null = await prisma.account.findUnique({
            where: { id: cursor },
            select: { parentAccountId: true },
          });
          cursor = parentLink?.parentAccountId ?? null;
        }
      }

      // If keeping the same parent (no reparenting), still ensure compatibility when type changes
      if (current.parentAccountId && parentAccountId === current.parentAccountId) {
        const parentRow2: { id: number; type: AccountType } | null = await prisma.account.findUnique({
          where: { id: current.parentAccountId },
          select: { id: true, type: true },
        });
        if (parentRow2) {
          const allowedChildren = ALLOWED_CHILDREN_BY_PARENT[parentRow2.type] ?? [];
          if (!allowedChildren.includes(type)) {
            throw new Error('INVALID_PARENT');
          }
        }
      }
    }
  }

  async getAllAccounts(options?: { structured?: boolean }): Promise<IAccountResponse[] | import('./account.types').AccountTree[]> {
    const rows = await prisma.account.findMany({
      include: ACCOUNT_INCLUDE,
      orderBy: [{ accountNumber: 'asc' }, { name: 'asc' }],
    });
    const flat = rows.map(mapAccount);
    const structured = options?.structured === true;
    if (!structured) {
      return flat;
    }
    // Build hierarchical tree respecting CK_nature_by_type and avoiding cycles
    const nodeMap = new Map<number, import('./account.types').AccountTree>();
    const typeById = new Map<number, AccountType>();
    const parentById = new Map<number, number | undefined>();
    for (const a of flat) {
      nodeMap.set(a.id, { ...a, children: [] });
      typeById.set(a.id, a.type);
      parentById.set(a.id, a.parentAccountId);
    }
    const roots: import('./account.types').AccountTree[] = [];
    const isCycle = (childId: number, parentId: number): boolean => {
      let cursor: number | undefined = parentId;
      const visited = new Set<number>();
      while (typeof cursor === 'number') {
        if (cursor === childId) return true;
        if (visited.has(cursor)) return true;
        visited.add(cursor);
        cursor = parentById.get(cursor);
      }
      return false;
    };
    for (const a of flat) {
      const parentId = a.parentAccountId;
      if (typeof parentId === 'number') {
        const parentType = typeById.get(parentId);
        const childType = a.type;
        const allowed = parentType ? (ALLOWED_CHILDREN_BY_PARENT[parentType] ?? []) : [];
        const parentIsLeafOnly = parentType ? LEAF_ONLY_TYPES.includes(parentType) : false;
        if (!parentType || parentIsLeafOnly || !allowed.includes(childType) || isCycle(a.id, parentId)) {
          roots.push(nodeMap.get(a.id)!);
        } else {
          const parentNode = nodeMap.get(parentId);
          if (parentNode) {
            parentNode.children.push(nodeMap.get(a.id)!);
          } else {
            roots.push(nodeMap.get(a.id)!);
          }
        }
      } else {
        roots.push(nodeMap.get(a.id)!);
      }
    }
    // Sort roots and children by accountNumber then name
    const sortNodes = (nodes: import('./account.types').AccountTree[]): void => {
      nodes.sort((x, y) => {
        const numCmp = x.accountNumber.localeCompare(y.accountNumber);
        return numCmp !== 0 ? numCmp : x.name.localeCompare(y.name);
      });
      for (const n of nodes) sortNodes(n.children);
    };
    sortNodes(roots);
    return roots;
  }

  async getAccountById(id: number): Promise<IAccountResponse | null> {
    const row = await prisma.account.findUnique({
      where: { id },
      include: {
        currency: true,
        parentAccount: true,
        childAccounts: true,
        createdBy: true,
        updatedBy: true,
      },
    });
    if (!row) return null;

    // Narrow to mapped fields only
    return mapAccount({
      id: row.id,
      accountNumber: row.accountNumber,
      name: row.name,
      description: row.description ?? null,
      type: row.type,
      currencyId: row.currencyId,
      parentAccountId: row.parentAccountId ?? null,
      isDetail: row.isDetail,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdById: row.createdById,
      updatedById: row.updatedById ?? null,
    });
  }

  async createAccount(
    data: ICreateAccount,
    requestContext?: IRequestContext
  ): Promise<IAccountResponse> {
    if (!requestContext?.userId) {
      throw new Error('AUTH_REQUIRED');
    }

    const accountNumber = (data.accountNumber ?? '').trim().toUpperCase();
    const name = (data.name ?? '').trim();
    const type = data.type;
    const currencyId = Number(data.currencyId);

    // Basic validations
    if (!accountNumber || accountNumber.length > 20) {
      throw new Error('ACCOUNT_NUMBER_INVALID');
    }
    if (!name) {
      throw new Error('NAME_REQUIRED');
    }
    if (!isValidAccountType(type)) {
      throw new Error('INVALID_ACCOUNT_TYPE');
    }
    if (!Number.isInteger(currencyId) || currencyId <= 0) {
      throw new Error('INVALID_CURRENCY');
    }

    const description =
      typeof data.description === 'string' && data.description.trim().length > 0
        ? data.description.trim()
        : null;

    const parentAccountId =
      typeof data.parentAccountId === 'number' && Number.isInteger(data.parentAccountId) && data.parentAccountId > 0
        ? data.parentAccountId
        : null;

    const isDetail = typeof data.isDetail === 'boolean' ? data.isDetail : true;
    const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
    if (LEAF_ONLY_TYPES.includes(type) && !isDetail) {
      throw new Error('INVALID_ACCOUNT_TYPE');
    }

    await ensureCurrencyExists(currencyId);
    if (parentAccountId !== null) {
      await ensureParentExists(parentAccountId);
    }
    await ensureUniqueAccountNumber(accountNumber);
    // Structural/type compatibility validation (CK_nature_by_type)
    await this.validateAccountTypeAndStructure({ type, parentAccountId });

    try {
      const created = await prisma.account.create({
        data: {
          accountNumber,
          name,
          description,
          type,
          currencyId,
          parentAccountId,
          isDetail,
          isActive,
          createdById: requestContext.userId as number,
        },
        include: ACCOUNT_INCLUDE,
      });

      // Audit success
      await prisma.userAuditLog.create({
        data: {
          userId: requestContext.userId,
          action: AuditAction.create,
          entityType: 'account',
          entityId: created.id,
          newData: {
            id: created.id,
            accountNumber: created.accountNumber,
            name: created.name,
            type: created.type,
            currencyId: created.currencyId,
            parentAccountId: created.parentAccountId ?? undefined,
            isDetail: created.isDetail,
            isActive: created.isActive,
          },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          success: true,
          performedAt: new Date(),
        },
      });

      return mapAccount(created);
    } catch (error: any) {
      // Map Prisma unique constraint error
      if (error?.code === 'P2002') {
        throw new Error('DUPLICATE_ACCOUNT_NUMBER');
      }
      // Audit failure
      try {
        await prisma.userAuditLog.create({
          data: {
            userId: requestContext.userId,
            action: AuditAction.create,
            entityType: 'account',
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

  async updateAccount(
    id: number,
    data: IUpdateAccount & { accountNumber?: string },
    requestContext?: IRequestContext
  ): Promise<IAccountResponse | null> {
    // Load current state
    const current = await prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        accountNumber: true,
        name: true,
        description: true,
        type: true,
        currencyId: true,
        parentAccountId: true,
        isDetail: true,
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

    // Disallow changing accountNumber
    if (typeof (data as any).accountNumber === 'string') {
      const requested = (data as any).accountNumber.trim().toUpperCase();
      if (requested !== current.accountNumber) {
        throw new Error('INVALID_OPERATION');
      }
    }

    // Build update payload strictly
    const updateData: Prisma.AccountUncheckedUpdateInput = {};

    if (typeof data.name === 'string') {
      const v = data.name.trim();
      if (!v) throw new Error('NAME_REQUIRED');
      updateData.name = v;
    }

    if (typeof data.description === 'string') {
      const v = data.description.trim();
      updateData.description = v.length > 0 ? v : null;
    } else if (data.description === null) {
      updateData.description = null;
    }

    if (typeof data.type === 'string') {
      if (!isValidAccountType(data.type)) {
        throw new Error('INVALID_ACCOUNT_TYPE');
      }
      updateData.type = data.type;
    }

    if (typeof data.currencyId === 'number') {
      if (!Number.isInteger(data.currencyId) || data.currencyId <= 0) {
        throw new Error('INVALID_CURRENCY');
      }
      await ensureCurrencyExists(data.currencyId);
      updateData.currencyId = data.currencyId;
    }

    if (typeof data.parentAccountId === 'number') {
      if (!Number.isInteger(data.parentAccountId) || data.parentAccountId <= 0) {
        throw new Error('INVALID_PARENT');
      }
      if (data.parentAccountId === id) {
        throw new Error('INVALID_PARENT');
      }
      await ensureParentExists(data.parentAccountId);
      updateData.parentAccountId = data.parentAccountId;
    } else if (data.parentAccountId === null) {
      updateData.parentAccountId = null;
    }

    if (typeof data.isDetail === 'boolean') {
      updateData.isDetail = data.isDetail;
    }

    if (typeof data.isActive === 'boolean') {
      updateData.isActive = data.isActive;
    }

    if (requestContext?.userId) {
      updateData.updatedById = requestContext.userId;
    }

    // Structural/type compatibility validation (CK_nature_by_type) prior to update
    {
      const newType: AccountType = (typeof data.type === 'string' ? (data.type as AccountType) : current.type) as AccountType;
      const newParentId: number | null =
        data.parentAccountId !== undefined
          ? (data.parentAccountId === null ? null : (data.parentAccountId as number))
          : (current.parentAccountId ?? null);
      // Additional LEAF_ONLY rule: cannot set isDetail false on leaf-only types
      if (LEAF_ONLY_TYPES.includes(newType) && data.isDetail === false) {
        throw new Error('INVALID_ACCOUNT_TYPE');
      }
      await this.validateAccountTypeAndStructure({
        type: newType,
        parentAccountId: newParentId,
        accountIdToUpdate: id,
      });
    }

    try {
      const updated = await prisma.account.update({
        where: { id },
        data: updateData,
        include: ACCOUNT_INCLUDE,
      });

      // Audit success
      await prisma.userAuditLog.create({
        data: {
          userId: requestContext?.userId,
          action: AuditAction.update,
          entityType: 'account',
          entityId: updated.id,
          newData: {
            id: updated.id,
            accountNumber: updated.accountNumber,
            name: updated.name,
            type: updated.type,
            currencyId: updated.currencyId,
            parentAccountId: updated.parentAccountId ?? undefined,
            isDetail: updated.isDetail,
            isActive: updated.isActive,
          },
          ipAddress: requestContext?.ipAddress,
          userAgent: requestContext?.userAgent,
          success: true,
          performedAt: new Date(),
        },
      });

      return mapAccount(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new Error('DUPLICATE_ACCOUNT_NUMBER');
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
            entityType: 'account',
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

  async deleteAccount(id: number, requestContext?: IRequestContext): Promise<boolean> {
    try {
      const exists = await prisma.account.findUnique({
        where: { id },
        select: { id: true, isActive: true },
      });
      if (!exists) {
        return false;
      }

      // Prevent deletion when there are subaccounts or accounting movements
      const childCount = await prisma.account.count({
        where: { parentAccountId: id, isActive: true },
      });
      if (childCount > 0) {
        // Audit conflict
        await prisma.userAuditLog.create({
          data: {
            userId: requestContext?.userId,
            action: AuditAction.delete,
            entityType: 'account',
            entityId: id,
            errorMessage: 'CONFLICT_CHILD_ACCOUNTS',
            ipAddress: requestContext?.ipAddress,
            userAgent: requestContext?.userAgent,
            success: false,
            performedAt: new Date(),
          },
        });
        throw new Error('CONFLICT_CHILD_ACCOUNTS');
      }
      // Note: Movement checks (journal/ledger) are not implemented because those tables do not exist yet.

      // Soft delete: mark inactive and set updatedById if available
      const deleteData: Prisma.AccountUncheckedUpdateInput = {
        isActive: false,
        ...(requestContext?.userId ? { updatedById: requestContext.userId } : {}),
      };

      await prisma.account.update({
        where: { id },
        data: deleteData,
      });

      await prisma.userAuditLog.create({
        data: {
          userId: requestContext?.userId,
          action: AuditAction.delete,
          entityType: 'account',
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
            entityType: 'account',
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