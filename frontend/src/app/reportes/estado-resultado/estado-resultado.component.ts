import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../dashboard/components/sidebar/sidebar.component';
import { 
  ReportService, 
  IncomeStatementEntry, 
  IncomeStatementSummary, 
  IncomeStatementQuery,
  IncomeStatementCategoryTotals,
  IncomeStatementCategory,
  AccountMovement,
  AccountMovementsQuery
} from '../../services/report.service';
import * as XLSX from 'xlsx';

type ReportState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

interface GroupedEntries {
  category: IncomeStatementCategory;
  categoryName: string;
  order: number;
  entries: IncomeStatementEntry[];
  totals: IncomeStatementCategoryTotals;
}

interface DrillDownState {
  isOpen: boolean;
  isLoading: boolean;
  account: {
    id: number;
    accountNumber: string;
    name: string;
    type: string;
  } | null;
  movements: AccountMovement[];
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  periodStart: string;
  periodEnd: string;
  error: string;
}

@Component({
  selector: 'app-estado-resultado',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, DatePipe],
  templateUrl: './estado-resultado.component.html',
  styleUrls: ['./estado-resultado.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstadoResultadoComponent implements OnInit {
  // Company info
  readonly companyTitle = 'IURIS CONSULTUS S.A';
  readonly reportTitle = 'Estado de Resultados';
  readonly reportSubtitle = 'Estado de Pérdidas y Ganancias';

  // Expose Math to template
  readonly Math = Math;

  // State management
  state = signal<ReportState>('idle');
  errorMessage = signal<string>('');
  
  // Report data
  entries = signal<IncomeStatementEntry[]>([]);
  categories = signal<IncomeStatementCategoryTotals[]>([]);
  summary = signal<IncomeStatementSummary | null>(null);
  generatedAt = signal<string>('');

  // UI state for collapsible sections
  expandedAccounts = signal<Set<number>>(new Set());
  collapsedCategories = signal<Set<IncomeStatementCategory>>(new Set());

  // Comparison mode
  isComparisonMode = signal<boolean>(false);

  // Filter options
  minDate = signal<string>('');
  maxDate = signal<string>('');

  // Filter form
  filters: IncomeStatementQuery = {
    startDate: '',
    endDate: '',
    compareStartDate: undefined,
    compareEndDate: undefined,
    includeInactive: false,
    showZeroBalances: false,
    groupByCategory: true
  };

  // Drill-down state
  drillDown = signal<DrillDownState>({
    isOpen: false,
    isLoading: false,
    account: null,
    movements: [],
    openingBalance: 0,
    closingBalance: 0,
    totalDebits: 0,
    totalCredits: 0,
    periodStart: '',
    periodEnd: '',
    error: ''
  });

  // Computed values
  groupedEntries = computed<GroupedEntries[]>(() => {
    const allEntries = this.entries();
    const categoryTotals = this.categories();
    const collapsedSet = this.collapsedCategories();
    const expandedSet = this.expandedAccounts();
    
    const categoryOrder: IncomeStatementCategory[] = ['revenue', 'costs', 'operating_expenses'];
    const categoryNames: Record<IncomeStatementCategory, string> = {
      revenue: 'INGRESOS',
      costs: 'COSTOS DE VENTA',
      operating_expenses: 'GASTOS OPERATIVOS'
    };

    return categoryOrder.map((category, index) => {
      const categoryEntries = allEntries.filter(e => e.category === category);
      const totals = categoryTotals.find(c => c.category === category) || {
        category,
        categoryName: categoryNames[category],
        order: index + 1,
        total: 0,
        accountCount: 0
      };

      // Filter entries based on expanded/collapsed state
      const visibleEntries = this.filterVisibleEntries(categoryEntries, expandedSet);

      return {
        category,
        categoryName: categoryNames[category],
        order: index + 1,
        entries: visibleEntries,
        totals
      };
    });
  });

  isProfit = computed(() => this.summary()?.isProfit ?? true);
  
  hasComparison = computed(() => !!this.summary()?.compareStartDate);

  formattedPeriod = computed(() => {
    const s = this.summary();
    if (!s) return '';
    return `${this.formatDate(s.startDate)} al ${this.formatDate(s.endDate)}`;
  });

  formattedComparePeriod = computed(() => {
    const s = this.summary();
    if (!s?.compareStartDate || !s?.compareEndDate) return '';
    return `${this.formatDate(s.compareStartDate)} al ${this.formatDate(s.compareEndDate)}`;
  });

  constructor(
    private reportService: ReportService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeDates();
    this.loadFilterOptions();
  }

  /**
   * Initialize date filters to current month
   */
  private initializeDates(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.filters.startDate = this.toISODate(firstDay);
    this.filters.endDate = this.toISODate(lastDay);
  }

  /**
   * Load filter options from API
   */
  private loadFilterOptions(): void {
    this.reportService.getJournalDateRange().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.minDate.set(response.data.minDate ?? '');
          this.maxDate.set(response.data.maxDate ?? '');
        }
      },
      error: () => {
        // Silent fail, dates will be unrestricted
      }
    });
  }

  /**
   * Filter entries based on hierarchy expansion state
   */
  private filterVisibleEntries(entries: IncomeStatementEntry[], expandedSet: Set<number>): IncomeStatementEntry[] {
    const result: IncomeStatementEntry[] = [];
    const hiddenParents = new Set<number>();

    // Sort by account number for proper hierarchy display
    const sortedEntries = [...entries].sort((a, b) => 
      a.accountNumber.localeCompare(b.accountNumber)
    );

    for (const entry of sortedEntries) {
      // Check if this entry's parent is hidden
      if (entry.parentAccountId && hiddenParents.has(entry.parentAccountId)) {
        hiddenParents.add(entry.accountId);
        continue;
      }

      // Check if parent is collapsed
      if (entry.parentAccountId && !expandedSet.has(entry.parentAccountId)) {
        hiddenParents.add(entry.accountId);
        continue;
      }

      result.push(entry);
    }

    return result;
  }

  /**
   * Generate the report
   */
  generateReport(): void {
    if (!this.filters.startDate || !this.filters.endDate) {
      return;
    }

    this.state.set('loading');
    this.errorMessage.set('');

    this.reportService.getIncomeStatement(this.filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.entries.set(response.data.entries);
          this.categories.set(response.data.categories);
          this.summary.set(response.data.summary);
          this.generatedAt.set(response.data.generatedAt);

          if (response.data.entries.length === 0) {
            this.state.set('empty');
          } else {
            this.state.set('success');
            // Auto-expand first level accounts
            this.expandFirstLevel();
          }
        } else {
          this.state.set('error');
          this.errorMessage.set(response.error?.message || 'Error desconocido');
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.state.set('error');
        this.errorMessage.set(
          error.error?.error?.message || 
          'Error al generar el estado de resultados. Intente nuevamente.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Auto-expand first level accounts
   */
  private expandFirstLevel(): void {
    const entries = this.entries();
    const firstLevelIds = entries
      .filter(e => e.accountLevel === 1 || !e.parentAccountId)
      .map(e => e.accountId);
    this.expandedAccounts.set(new Set(firstLevelIds));
  }

  /**
   * Toggle category collapse state
   */
  toggleCategory(category: IncomeStatementCategory): void {
    const collapsed = this.collapsedCategories();
    const newSet = new Set(collapsed);
    
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    
    this.collapsedCategories.set(newSet);
  }

  /**
   * Toggle account expansion state
   */
  toggleAccount(accountId: number): void {
    const expanded = this.expandedAccounts();
    const newSet = new Set(expanded);
    
    if (newSet.has(accountId)) {
      newSet.delete(accountId);
    } else {
      newSet.add(accountId);
    }
    
    this.expandedAccounts.set(newSet);
  }

  /**
   * Check if an account is expanded
   */
  isAccountExpanded(accountId: number): boolean {
    return this.expandedAccounts().has(accountId);
  }

  /**
   * Check if an account has children
   */
  hasChildren(entry: IncomeStatementEntry): boolean {
    const entries = this.entries();
    return entries.some(e => e.parentAccountId === entry.accountId);
  }

  /**
   * Check if category is collapsed
   */
  isCategoryCollapsed(category: IncomeStatementCategory): boolean {
    return this.collapsedCategories().has(category);
  }

  /**
   * Expand all accounts
   */
  expandAll(): void {
    const entries = this.entries();
    const allIds = entries.map(e => e.accountId);
    this.expandedAccounts.set(new Set(allIds));
    this.collapsedCategories.set(new Set());
  }

  /**
   * Collapse all accounts
   */
  collapseAll(): void {
    this.expandedAccounts.set(new Set());
    const categories: IncomeStatementCategory[] = ['revenue', 'costs', 'operating_expenses'];
    this.collapsedCategories.set(new Set(categories));
  }

  /**
   * Toggle comparison mode
   */
  toggleComparisonMode(): void {
    if (this.filters.compareStartDate) {
      this.filters.compareStartDate = undefined;
      this.filters.compareEndDate = undefined;
    } else {
      // Set previous period (previous month)
      const start = new Date(this.filters.startDate);
      const end = new Date(this.filters.endDate);
      const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
      
      this.filters.compareStartDate = this.toISODate(prevStart);
      this.filters.compareEndDate = this.toISODate(prevEnd);
    }
  }

  /**
   * Reset filters to defaults
   */
  resetFilters(): void {
    this.initializeDates();
    this.filters.compareStartDate = undefined;
    this.filters.compareEndDate = undefined;
    this.filters.includeInactive = false;
    this.filters.showZeroBalances = false;
    this.filters.groupByCategory = true;
    this.state.set('idle');
    this.entries.set([]);
    this.categories.set([]);
    this.summary.set(null);
  }

  /**
   * Open drill-down modal for account movements
   */
  openDrillDown(entry: IncomeStatementEntry): void {
    if (!entry.isDetail) return;

    const query: AccountMovementsQuery = {
      accountId: entry.accountId,
      startDate: this.filters.startDate,
      endDate: this.filters.endDate
    };

    this.drillDown.update(state => ({
      ...state,
      isOpen: true,
      isLoading: true,
      account: {
        id: entry.accountId,
        accountNumber: entry.accountNumber,
        name: entry.accountName,
        type: entry.accountType
      },
      movements: [],
      error: ''
    }));

    this.reportService.getAccountMovements(query).subscribe({
      next: (response) => {
        if (response.success) {
          this.drillDown.update(state => ({
            ...state,
            isLoading: false,
            movements: response.data.movements,
            openingBalance: response.data.openingBalance,
            closingBalance: response.data.closingBalance,
            totalDebits: response.data.totalDebits,
            totalCredits: response.data.totalCredits,
            periodStart: response.data.periodStart,
            periodEnd: response.data.periodEnd
          }));
        } else {
          this.drillDown.update(state => ({
            ...state,
            isLoading: false,
            error: response.error?.message || 'Error al cargar movimientos'
          }));
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.drillDown.update(state => ({
          ...state,
          isLoading: false,
          error: 'Error al cargar los movimientos de la cuenta'
        }));
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Close drill-down modal
   */
  closeDrillDown(): void {
    this.drillDown.update(state => ({
      ...state,
      isOpen: false,
      account: null,
      movements: []
    }));
  }

  /**
   * Export to Excel
   */
  exportToExcel(): void {
    const s = this.summary();
    if (!s) return;

    // Prepare workbook data
    const wb = XLSX.utils.book_new();

    // Header rows
    const headerRows = [
      [this.companyTitle],
      [this.reportTitle],
      [`Período: ${this.formatDate(s.startDate)} al ${this.formatDate(s.endDate)}`],
      [''],
    ];

    // Add comparison period header if applicable
    if (this.hasComparison()) {
      headerRows[2] = [
        `Período Actual: ${this.formatDate(s.startDate)} al ${this.formatDate(s.endDate)}`,
        '',
        `Período Anterior: ${this.formatDate(s.compareStartDate!)} al ${this.formatDate(s.compareEndDate!)}`
      ];
    }

    // Build data rows
    const dataRows: any[][] = [];
    const grouped = this.groupedEntries();

    // Column headers
    const columns = this.hasComparison() 
      ? ['Cuenta', 'Nombre', 'Monto Actual', 'Monto Anterior', 'Variación', 'Var. %']
      : ['Cuenta', 'Nombre', 'Monto'];
    
    dataRows.push(columns);

    for (const group of grouped) {
      // Category header
      dataRows.push([group.categoryName, '', '', '', '', '']);
      
      // Entries
      for (const entry of this.entries().filter(e => e.category === group.category)) {
        const indent = '  '.repeat(entry.accountLevel - 1);
        const row = this.hasComparison()
          ? [
              entry.accountNumber,
              `${indent}${entry.accountName}`,
              entry.amount,
              entry.previousAmount ?? 0,
              entry.variance ?? 0,
              entry.variancePercentage ?? 0
            ]
          : [
              entry.accountNumber,
              `${indent}${entry.accountName}`,
              entry.amount
            ];
        dataRows.push(row);
      }

      // Category total
      const totalRow = this.hasComparison()
        ? ['', `Total ${group.categoryName}`, group.totals.total, group.totals.previousTotal ?? 0, group.totals.variance ?? 0, group.totals.variancePercentage ?? 0]
        : ['', `Total ${group.categoryName}`, group.totals.total];
      dataRows.push(totalRow);
      dataRows.push(['']);
    }

    // Summary section
    dataRows.push(['']);
    dataRows.push(['RESUMEN']);
    
    if (this.hasComparison()) {
      dataRows.push(['', 'Utilidad Bruta', s.grossProfit, s.previousGrossProfit ?? 0, s.grossProfitVariance ?? 0, s.grossProfitVariancePercentage ?? 0]);
      dataRows.push(['', 'Utilidad Operativa', s.operatingIncome, s.previousOperatingIncome ?? 0, '', '']);
      dataRows.push(['', 'Utilidad Neta', s.netIncome, s.previousNetIncome ?? 0, s.netIncomeVariance ?? 0, s.netIncomeVariancePercentage ?? 0]);
    } else {
      dataRows.push(['', 'Utilidad Bruta', s.grossProfit]);
      dataRows.push(['', 'Utilidad Operativa', s.operatingIncome]);
      dataRows.push(['', 'Utilidad Neta', s.netIncome]);
    }

    dataRows.push(['']);
    dataRows.push(['', 'Margen Bruto', `${s.grossProfitMargin}%`]);
    dataRows.push(['', 'Margen Operativo', `${s.operatingMargin}%`]);
    dataRows.push(['', 'Margen Neto', `${s.netProfitMargin}%`]);

    // Combine all rows
    const wsData = [...headerRows, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Resultados');

    // Generate filename
    const filename = `estado_resultados_${s.startDate}_${s.endDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  /**
   * Print/PDF export using browser print
   */
  printReport(): void {
    window.print();
  }

  /**
   * Navigate back to reports list
   */
  goBack(): void {
    this.router.navigate(['/reportes']);
  }

  /**
   * Format date to localized string
   */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Convert Date to ISO date string (YYYY-MM-DD)
   */
  private toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get CSS class for variance display
   */
  getVarianceClass(variance: number | undefined, isExpense: boolean = false): string {
    if (variance === undefined || variance === 0) return 'variance-neutral';
    
    // For expenses, positive variance is bad (costs increased)
    // For revenue, positive variance is good (revenue increased)
    if (isExpense) {
      return variance > 0 ? 'variance-negative' : 'variance-positive';
    }
    return variance > 0 ? 'variance-positive' : 'variance-negative';
  }

  /**
   * Get CSS class for profit/loss display
   */
  getProfitClass(value: number): string {
    if (value > 0) return 'profit';
    if (value < 0) return 'loss';
    return '';
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'NIO',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Format percentage value
   */
  formatPercentage(value: number | undefined): string {
    if (value === undefined) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  /**
   * Get category icon based on type
   */
  getCategoryIcon(category: IncomeStatementCategory): string {
    switch (category) {
      case 'revenue':
        return 'trending-up';
      case 'costs':
        return 'package';
      case 'operating_expenses':
        return 'credit-card';
      default:
        return 'folder';
    }
  }

  /**
   * Track by function for ngFor
   */
  trackByAccountId(index: number, entry: IncomeStatementEntry): number {
    return entry.accountId;
  }

  trackByCategory(index: number, group: GroupedEntries): string {
    return group.category;
  }
}
