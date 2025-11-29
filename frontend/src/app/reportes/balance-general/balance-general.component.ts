import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../dashboard/components/sidebar/sidebar.component';
import { 
  ReportService, 
  BalanceSheetEntry, 
  BalanceSheetSummary, 
  BalanceSheetQuery,
  BalanceSheetSectionTotals,
  BalanceSheetSection,
  AccountMovement,
  AccountMovementsQuery
} from '../../services/report.service';
import * as XLSX from 'xlsx';

type ReportState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

interface GroupedEntries {
  section: BalanceSheetSection;
  sectionName: string;
  entries: BalanceSheetEntry[];
  totals: BalanceSheetSectionTotals;
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
  selector: 'app-balance-general',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, DatePipe, DecimalPipe],
  templateUrl: './balance-general.component.html',
  styleUrls: ['./balance-general.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalanceGeneralComponent implements OnInit {
  // Company info
  readonly companyTitle = 'IURIS CONSULTUS S.A';
  readonly reportTitle = 'Balance General';
  readonly reportSubtitle = 'Estado de Situación Financiera';

  // State management
  state = signal<ReportState>('idle');
  errorMessage = signal<string>('');
  
  // Report data
  entries = signal<BalanceSheetEntry[]>([]);
  sections = signal<BalanceSheetSectionTotals[]>([]);
  summary = signal<BalanceSheetSummary | null>(null);
  generatedAt = signal<string>('');

  // UI state for collapsible sections
  expandedAccounts = signal<Set<number>>(new Set());
  collapsedSections = signal<Set<BalanceSheetSection>>(new Set());

  // Comparison mode
  isComparisonMode = signal<boolean>(false);

  // Filter options
  minDate = signal<string>('');
  maxDate = signal<string>('');

  // Filter form
  filters: BalanceSheetQuery = {
    asOfDate: '',
    compareDate: undefined,
    includeInactive: false,
    showZeroBalances: false
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
    const sectionTotals = this.sections();
    const collapsedSet = this.collapsedSections();
    const expandedSet = this.expandedAccounts();
    
    const sectionOrder: BalanceSheetSection[] = ['assets', 'liabilities', 'equity'];
    const sectionNames: Record<BalanceSheetSection, string> = {
      assets: 'ACTIVOS',
      liabilities: 'PASIVOS',
      equity: 'PATRIMONIO'
    };

    return sectionOrder.map(section => {
      const sectionEntries = allEntries.filter(e => e.section === section);
      const totals = sectionTotals.find(s => s.section === section) || {
        section,
        sectionName: sectionNames[section],
        total: 0,
        accountCount: 0
      };

      // Filter entries based on expanded/collapsed state
      const visibleEntries = this.filterVisibleEntries(sectionEntries, expandedSet);

      return {
        section,
        sectionName: sectionNames[section],
        entries: visibleEntries,
        totals
      };
    });
  });

  isBalanced = computed(() => this.summary()?.isBalanced ?? true);
  
  hasComparison = computed(() => !!this.summary()?.compareDate);

  formattedAsOfDate = computed(() => {
    const s = this.summary();
    if (!s) return '';
    return this.formatDate(s.asOfDate);
  });

  formattedCompareDate = computed(() => {
    const s = this.summary();
    if (!s?.compareDate) return '';
    return this.formatDate(s.compareDate);
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
   * Initialize date filters to current date
   */
  private initializeDates(): void {
    const now = new Date();
    this.filters.asOfDate = this.toISODate(now);
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
  private filterVisibleEntries(entries: BalanceSheetEntry[], expandedSet: Set<number>): BalanceSheetEntry[] {
    const result: BalanceSheetEntry[] = [];
    const hiddenParents = new Set<number>();

    // Sort by account number for proper hierarchy display
    const sortedEntries = [...entries].sort((a, b) => 
      a.accountNumber.localeCompare(b.accountNumber)
    );

    for (const entry of sortedEntries) {
      // Check if any parent is collapsed
      if (entry.parentAccountId && hiddenParents.has(entry.parentAccountId)) {
        hiddenParents.add(entry.accountId);
        continue;
      }

      // Check if parent is not expanded (collapsed by default)
      if (entry.parentAccountId) {
        const parent = entries.find(e => e.accountId === entry.parentAccountId);
        if (parent && !parent.isDetail && !expandedSet.has(parent.accountId)) {
          hiddenParents.add(entry.accountId);
          continue;
        }
      }

      result.push(entry);

      // If this is a parent account that's collapsed, mark children as hidden
      if (!entry.isDetail && !expandedSet.has(entry.accountId)) {
        hiddenParents.add(entry.accountId);
      }
    }

    return result;
  }

  /**
   * Generate the Balance Sheet report
   */
  generateReport(): void {
    // Validate date
    if (!this.filters.asOfDate) {
      this.state.set('error');
      this.errorMessage.set('Debe seleccionar la fecha del balance.');
      return;
    }

    // Validate comparison date if provided
    if (this.filters.compareDate && new Date(this.filters.compareDate) >= new Date(this.filters.asOfDate)) {
      this.state.set('error');
      this.errorMessage.set('La fecha de comparación debe ser anterior a la fecha del balance.');
      return;
    }

    this.state.set('loading');
    this.errorMessage.set('');

    const query: BalanceSheetQuery = {
      asOfDate: this.filters.asOfDate,
      compareDate: this.filters.compareDate || undefined,
      includeInactive: this.filters.includeInactive,
      showZeroBalances: this.filters.showZeroBalances
    };

    this.reportService.getBalanceSheet(query).subscribe({
      next: (response) => {
        if (response.success) {
          const data = response.data;
          this.entries.set(data.entries);
          this.sections.set(data.sections);
          this.summary.set(data.summary);
          this.generatedAt.set(data.generatedAt);
          this.isComparisonMode.set(!!query.compareDate);

          // Initialize all parent accounts as collapsed
          this.expandedAccounts.set(new Set());
          this.collapsedSections.set(new Set());

          if (data.entries.length === 0) {
            this.state.set('empty');
          } else {
            this.state.set('success');
          }
        } else {
          this.state.set('error');
          this.errorMessage.set(response.error?.message ?? 'Error al generar el reporte.');
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error generating balance sheet:', error);
        this.state.set('error');
        this.errorMessage.set(
          error.error?.error?.message ?? 
          'Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Toggle section collapse/expand
   */
  toggleSection(section: BalanceSheetSection): void {
    const current = this.collapsedSections();
    const newSet = new Set(current);
    
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    
    this.collapsedSections.set(newSet);
  }

  /**
   * Check if section is collapsed
   */
  isSectionCollapsed(section: BalanceSheetSection): boolean {
    return this.collapsedSections().has(section);
  }

  /**
   * Toggle account expand/collapse
   */
  toggleAccount(accountId: number): void {
    const current = this.expandedAccounts();
    const newSet = new Set(current);
    
    if (newSet.has(accountId)) {
      newSet.delete(accountId);
    } else {
      newSet.add(accountId);
    }
    
    this.expandedAccounts.set(newSet);
  }

  /**
   * Check if account is expanded
   */
  isAccountExpanded(accountId: number): boolean {
    return this.expandedAccounts().has(accountId);
  }

  /**
   * Check if account has children
   */
  hasChildren(entry: BalanceSheetEntry): boolean {
    if (entry.isDetail) return false;
    return this.entries().some(e => e.parentAccountId === entry.accountId);
  }

  /**
   * Expand all accounts
   */
  expandAll(): void {
    const allParentIds = this.entries()
      .filter(e => !e.isDetail)
      .map(e => e.accountId);
    this.expandedAccounts.set(new Set(allParentIds));
  }

  /**
   * Collapse all accounts
   */
  collapseAll(): void {
    this.expandedAccounts.set(new Set());
  }

  /**
   * Open drill-down for an account
   */
  openDrillDown(entry: BalanceSheetEntry): void {
    if (!entry.isDetail) return;

    const summary = this.summary();
    if (!summary) return;

    // Use fiscal year start or 1 year back as default
    const endDate = summary.asOfDate;
    const startDate = summary.compareDate || this.getStartOfYear(endDate);

    this.drillDown.set({
      isOpen: true,
      isLoading: true,
      account: {
        id: entry.accountId,
        accountNumber: entry.accountNumber,
        name: entry.accountName,
        type: entry.accountType
      },
      movements: [],
      openingBalance: 0,
      closingBalance: 0,
      totalDebits: 0,
      totalCredits: 0,
      periodStart: startDate,
      periodEnd: endDate,
      error: ''
    });

    const query: AccountMovementsQuery = {
      accountId: entry.accountId,
      startDate,
      endDate
    };

    this.reportService.getAccountMovements(query).subscribe({
      next: (response) => {
        if (response.success) {
          const data = response.data;
          this.drillDown.update(state => ({
            ...state,
            isLoading: false,
            movements: data.movements,
            openingBalance: data.openingBalance,
            closingBalance: data.closingBalance,
            totalDebits: data.totalDebits,
            totalCredits: data.totalCredits,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd
          }));
        } else {
          this.drillDown.update(state => ({
            ...state,
            isLoading: false,
            error: response.error?.message ?? 'Error al cargar movimientos'
          }));
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.drillDown.update(state => ({
          ...state,
          isLoading: false,
          error: error.error?.error?.message ?? 'Error de conexión'
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
      isOpen: false
    }));
  }

  /**
   * Get start of fiscal year
   */
  private getStartOfYear(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-01-01`;
  }

  /**
   * Export report to Excel
   */
  exportToExcel(): void {
    const entriesData = this.entries();
    const summaryData = this.summary();

    if (entriesData.length === 0) {
      return;
    }

    const hasComparison = this.hasComparison();

    // Build Excel data
    const excelData: any[] = [];

    // Add header info
    excelData.push({ 'A': this.companyTitle });
    excelData.push({ 'A': this.reportTitle });
    excelData.push({ 'A': `Al ${this.formatDate(summaryData?.asOfDate || '')}` });
    if (hasComparison && summaryData?.compareDate) {
      excelData.push({ 'A': `Comparativo con ${this.formatDate(summaryData.compareDate)}` });
    }
    excelData.push({}); // Empty row

    // Section headers
    const sections: BalanceSheetSection[] = ['assets', 'liabilities', 'equity'];
    const sectionNames: Record<BalanceSheetSection, string> = {
      assets: 'ACTIVOS',
      liabilities: 'PASIVOS',
      equity: 'PATRIMONIO'
    };

    for (const section of sections) {
      const sectionEntries = entriesData.filter(e => e.section === section);
      const sectionTotal = this.sections().find(s => s.section === section);

      // Add section header
      excelData.push({
        'Código': '',
        'Cuenta': sectionNames[section],
        'Saldo Actual': '',
        ...(hasComparison ? { 'Saldo Anterior': '', 'Variación': '', 'Variación %': '' } : {})
      });

      // Add entries
      for (const entry of sectionEntries) {
        const indent = '  '.repeat(entry.accountLevel - 1);
        const row: any = {
          'Código': entry.accountNumber,
          'Cuenta': indent + entry.accountName,
          'Saldo Actual': entry.balance
        };

        if (hasComparison) {
          row['Saldo Anterior'] = entry.previousBalance ?? 0;
          row['Variación'] = entry.variance ?? 0;
          row['Variación %'] = entry.variancePercentage ? `${entry.variancePercentage}%` : '0%';
        }

        excelData.push(row);
      }

      // Add section total
      const totalRow: any = {
        'Código': '',
        'Cuenta': `TOTAL ${sectionNames[section]}`,
        'Saldo Actual': sectionTotal?.total ?? 0
      };

      if (hasComparison) {
        totalRow['Saldo Anterior'] = sectionTotal?.previousTotal ?? 0;
        totalRow['Variación'] = sectionTotal?.variance ?? 0;
        totalRow['Variación %'] = sectionTotal?.variancePercentage ? `${sectionTotal.variancePercentage}%` : '0%';
      }

      excelData.push(totalRow);
      excelData.push({}); // Empty row
    }

    // Add summary
    excelData.push({});
    excelData.push({
      'Código': '',
      'Cuenta': 'TOTAL PASIVOS + PATRIMONIO',
      'Saldo Actual': summaryData?.totalLiabilitiesAndEquity ?? 0
    });
    excelData.push({
      'Código': '',
      'Cuenta': 'DIFERENCIA (Activos - Pasivos - Patrimonio)',
      'Saldo Actual': summaryData?.difference ?? 0
    });
    excelData.push({
      'Código': '',
      'Cuenta': summaryData?.isBalanced ? 'BALANCE CUADRADO ✓' : 'BALANCE DESCUADRADO ✗',
      'Saldo Actual': ''
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });
    const workbook = XLSX.utils.book_new();

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 },  // Código
      { wch: 45 },  // Cuenta
      { wch: 18 },  // Saldo Actual
      ...(hasComparison ? [
        { wch: 18 }, // Saldo Anterior
        { wch: 15 }, // Variación
        { wch: 12 }  // Variación %
      ] : [])
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance General');

    // Generate filename
    const filename = `balance_general_${this.filters.asOfDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export to PDF (uses browser print)
   */
  exportToPDF(): void {
    window.print();
  }

  /**
   * Print report
   */
  printReport(): void {
    window.print();
  }

  /**
   * Navigate back to reports menu
   */
  goBack(): void {
    this.router.navigate(['/reportes']);
  }

  /**
   * Reset filters and state
   */
  resetFilters(): void {
    this.initializeDates();
    this.filters.compareDate = undefined;
    this.filters.includeInactive = false;
    this.filters.showZeroBalances = false;
    this.state.set('idle');
    this.entries.set([]);
    this.sections.set([]);
    this.summary.set(null);
    this.expandedAccounts.set(new Set());
    this.collapsedSections.set(new Set());
    this.isComparisonMode.set(false);
  }

  /**
   * Toggle comparison mode
   */
  toggleComparisonMode(): void {
    if (this.filters.compareDate) {
      this.filters.compareDate = undefined;
    } else {
      // Default to same date last year
      const asOf = new Date(this.filters.asOfDate);
      asOf.setFullYear(asOf.getFullYear() - 1);
      this.filters.compareDate = this.toISODate(asOf);
    }
  }

  /**
   * Get CSS class for variance indicator
   */
  getVarianceClass(variance: number | undefined): string {
    if (variance === undefined || variance === 0) return 'variance-neutral';
    return variance > 0 ? 'variance-positive' : 'variance-negative';
  }

  /**
   * Get variance indicator icon
   */
  getVarianceIcon(variance: number | undefined): string {
    if (variance === undefined || variance === 0) return '→';
    return variance > 0 ? '↑' : '↓';
  }

  /**
   * Get CSS class for account type badge
   */
  getAccountTypeClass(type: string): string {
    const typeClasses: Record<string, string> = {
      'Activo': 'type-activo',
      'Pasivo': 'type-pasivo',
      'Capital': 'type-capital'
    };
    return typeClasses[type] ?? 'type-default';
  }

  /**
   * Format date for display
   */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Format short date for display
   */
  formatShortDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Convert Date to ISO date string (YYYY-MM-DD)
   */
  private toISODate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Track function for ngFor
   */
  trackByAccountId(index: number, entry: BalanceSheetEntry): number {
    return entry.accountId;
  }

  /**
   * Track function for sections
   */
  trackBySection(index: number, group: GroupedEntries): string {
    return group.section;
  }

  /**
   * Track function for movements
   */
  trackByMovement(index: number, movement: AccountMovement): number {
    return movement.journalEntryId;
  }
}
