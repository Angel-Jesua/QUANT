import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { Account, AccountTreeNode } from '../../models/account.model';

/** Tipos de cuenta disponibles para filtrar */
const ACCOUNT_TYPES = ['Activo', 'Pasivo', 'Capital', 'Ingresos', 'Gastos', 'Costos'] as const;
type AccountTypeFilter = typeof ACCOUNT_TYPES[number] | '';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountListComponent implements OnInit {
  private accountService = inject(AccountService);
  
  /** Raw accounts from API */
  private rawAccounts = signal<Account[]>([]);
  
  /** Tree structure of accounts */
  accountTree = signal<AccountTreeNode[]>([]);
  
  /** Set of expanded account IDs */
  expandedIds = signal<Set<number>>(new Set());
  
  /** Filtro por tipo de cuenta */
  typeFilter = signal<AccountTypeFilter>('');
  
  /** Filtro por texto de búsqueda */
  searchFilter = signal<string>('');
  
  /** Mostrar solo cuentas activas */
  showActiveOnly = signal<boolean>(true);
  
  /** Lista de tipos de cuenta para el dropdown */
  accountTypes = ACCOUNT_TYPES;
  
  /** Árbol filtrado según los criterios */
  filteredTree = computed(() => {
    const tree = this.accountTree();
    const typeFilter = this.typeFilter();
    const searchFilter = this.searchFilter().toLowerCase().trim();
    const activeOnly = this.showActiveOnly();
    
    if (!typeFilter && !searchFilter && !activeOnly) {
      return tree;
    }
    
    // Filtrar recursivamente manteniendo la jerarquía
    const filterNodes = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
      return nodes
        .map(node => {
          const filteredChildren = filterNodes(node.children);
          const matchesType = !typeFilter || node.type === typeFilter;
          const matchesSearch = !searchFilter || 
            node.code.toLowerCase().includes(searchFilter) ||
            node.name.toLowerCase().includes(searchFilter) ||
            (node.detailType?.toLowerCase().includes(searchFilter) ?? false);
          const matchesActive = !activeOnly || node.isActive;
          
          // Incluir si coincide o tiene hijos que coinciden
          const hasMatchingChildren = filteredChildren.length > 0;
          const matchesSelf = matchesType && matchesSearch && matchesActive;
          
          if (matchesSelf || hasMatchingChildren) {
            return {
              ...node,
              children: filteredChildren,
              hasChildren: filteredChildren.length > 0
            };
          }
          return null;
        })
        .filter((node): node is AccountTreeNode => node !== null);
    };
    
    return filterNodes(tree);
  });
  
  /** Flattened visible rows for display */
  visibleRows = computed(() => {
    const expanded = this.expandedIds();
    const result: AccountTreeNode[] = [];
    
    const flatten = (nodes: AccountTreeNode[], parentExpanded: boolean = true) => {
      for (const node of nodes) {
        if (parentExpanded) {
          result.push(node);
        }
        if (node.children.length > 0) {
          flatten(node.children, parentExpanded && expanded.has(node.id));
        }
      }
    };
    
    flatten(this.filteredTree());
    return result;
  });
  
  /** Contador de cuentas visibles */
  visibleCount = computed(() => this.visibleRows().length);
  
  /** Contador total de cuentas */
  totalCount = computed(() => this.rawAccounts().length);

  ngOnInit(): void {
    this.loadAccounts();
  }
  
  /** Actualizar filtro de tipo */
  onTypeFilterChange(type: string): void {
    this.typeFilter.set(type as AccountTypeFilter);
  }
  
  /** Actualizar filtro de búsqueda */
  onSearchChange(search: string): void {
    this.searchFilter.set(search);
  }
  
  /** Toggle mostrar solo activas */
  toggleActiveOnly(): void {
    this.showActiveOnly.update(v => !v);
  }
  
  /** Limpiar todos los filtros */
  clearFilters(): void {
    this.typeFilter.set('');
    this.searchFilter.set('');
    this.showActiveOnly.set(true);
  }

  loadAccounts() {
    this.accountService.getAccounts().subscribe(data => {
      this.rawAccounts.set(data);
      const tree = this.buildAccountTree(data);
      this.accountTree.set(tree);
    });
  }

  /**
   * Build hierarchical tree from flat account list
   */
  private buildAccountTree(accounts: Account[]): AccountTreeNode[] {
    // Create a map for quick lookup
    const accountMap = new Map<number, AccountTreeNode>();
    const codeMap = new Map<string, AccountTreeNode>();
    const rootNodes: AccountTreeNode[] = [];

    // First pass: create all nodes
    for (const account of accounts) {
      // Usar code o accountNumber (compatibilidad)
      const code = account.code || account.accountNumber;
      const node: AccountTreeNode = {
        ...account,
        code,
        children: [],
        level: this.calculateLevel(code),
        isExpanded: false,
        hasChildren: false,
      };
      accountMap.set(account.id, node);
      codeMap.set(code, node);
    }

    // Second pass: build parent-child relationships
    for (const account of accounts) {
      const code = account.code || account.accountNumber;
      const node = accountMap.get(account.id)!;
      
      if (account.parentAccountId && accountMap.has(account.parentAccountId)) {
        const parent = accountMap.get(account.parentAccountId)!;
        parent.children.push(node);
        parent.hasChildren = true;
      } else {
        // Check if this is a root account by code structure
        const parentCode = this.findParentCode(code);
        let foundParent = false;
        
        if (parentCode && codeMap.has(parentCode)) {
          const parent = codeMap.get(parentCode)!;
          parent.children.push(node);
          parent.hasChildren = true;
          foundParent = true;
        }
        
        if (!foundParent) {
          rootNodes.push(node);
        }
      }
    }

    // Sort children by code at each level
    const sortChildren = (nodes: AccountTreeNode[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      for (const node of nodes) {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      }
    };
    
    sortChildren(rootNodes);
    return rootNodes;
  }

  /**
   * Calculate hierarchy level from account code
   */
  private calculateLevel(code: string): number {
    const segments = code.split('-');
    if (segments.length !== 3) return 0;

    const [first, second, third] = segments;
    const firstNum = parseInt(first, 10);
    const secondNum = parseInt(second, 10);
    const thirdNum = parseInt(third, 10);

    if (thirdNum > 0) return 3;
    if (secondNum > 0) return 2;
    
    // Check digits within first segment
    const d1 = parseInt(first.charAt(0), 10);
    const d2 = parseInt(first.charAt(1), 10);
    const d3 = parseInt(first.charAt(2), 10);
    
    if (d3 > 0) return 2;
    if (d2 > 0) return 1;
    return 0;
  }

  /**
   * Find parent code based on account number structure
   */
  private findParentCode(code: string): string | null {
    const segments = code.split('-');
    if (segments.length !== 3) return null;

    const [first, second, third] = segments;
    const secondNum = parseInt(second, 10);
    const thirdNum = parseInt(third, 10);

    // If third segment has value, parent has zeroed third segment
    if (thirdNum > 0) {
      return `${first}-${second}-000`;
    }

    // If second segment has value, parent has zeroed second segment
    if (secondNum > 0) {
      return `${first}-000-000`;
    }

    // Check first segment structure
    const d1 = first.charAt(0);
    const d2 = parseInt(first.charAt(1), 10);
    const d3 = parseInt(first.charAt(2), 10);

    if (d3 > 0) {
      return `${d1}${d2}0-000-000`;
    }

    if (d2 > 0) {
      return `${d1}00-000-000`;
    }

    return null;
  }

  /**
   * Toggle expansion of an account node
   */
  toggleExpand(account: AccountTreeNode): void {
    if (!account.hasChildren) return;
    
    this.expandedIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(account.id)) {
        newIds.delete(account.id);
        // Also collapse all children recursively
        this.collapseChildren(account, newIds);
      } else {
        newIds.add(account.id);
      }
      return newIds;
    });
  }

  /**
   * Recursively collapse all children
   */
  private collapseChildren(node: AccountTreeNode, ids: Set<number>): void {
    for (const child of node.children) {
      ids.delete(child.id);
      if (child.hasChildren) {
        this.collapseChildren(child, ids);
      }
    }
  }

  /**
   * Expand all nodes
   */
  expandAll(): void {
    const allIds = new Set<number>();
    const collectIds = (nodes: AccountTreeNode[]) => {
      for (const node of nodes) {
        if (node.hasChildren) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    };
    collectIds(this.accountTree());
    this.expandedIds.set(allIds);
  }

  /**
   * Collapse all nodes
   */
  collapseAll(): void {
    this.expandedIds.set(new Set());
  }

  /**
   * Check if an account is expanded
   */
  isExpanded(account: AccountTreeNode): boolean {
    return this.expandedIds().has(account.id);
  }

  toggleStatus(account: AccountTreeNode) {
    console.log('Toggle status', account);
  }

  viewAccount(account: AccountTreeNode) {
    console.log('View account', account);
  }
}
