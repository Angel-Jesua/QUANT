import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../../dashboard/components/sidebar/sidebar.component';
import { ReportService, TrialBalanceEntry, TrialBalanceSummary, TrialBalanceQuery } from '../../services/report.service';
import * as XLSX from 'xlsx';

type ReportState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, DatePipe, DecimalPipe],
  templateUrl: './trial-balance.component.html',
  styleUrls: ['./trial-balance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrialBalanceComponent implements OnInit {
  // Company info
  readonly companyTitle = 'IURIS CONSULTUS S.A';
  readonly reportTitle = 'Balanza de Comprobación';

  // State management
  state = signal<ReportState>('idle');
  errorMessage = signal<string>('');
  
  // Report data
  entries = signal<TrialBalanceEntry[]>([]);
  summary = signal<TrialBalanceSummary | null>(null);
  generatedAt = signal<string>('');

  // Filter options
  availableLevels = signal<number[]>([]);
  minDate = signal<string>('');
  maxDate = signal<string>('');

  // Filter form
  filters: TrialBalanceQuery = {
    startDate: '',
    endDate: '',
    accountLevel: undefined,
    includeInactive: false,
    onlyWithMovements: true
  };

  // Computed values for display
  displayEntries = computed(() => this.entries());
  
  isBalanced = computed(() => this.summary()?.isBalanced ?? true);
  
  formattedPeriod = computed(() => {
    const s = this.summary();
    if (!s) return '';
    return `${this.formatDate(s.periodStart)} al ${this.formatDate(s.periodEnd)}`;
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
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.filters.startDate = this.toISODate(firstDayOfMonth);
    this.filters.endDate = this.toISODate(lastDayOfMonth);
  }

  /**
   * Load filter options from API
   */
  private loadFilterOptions(): void {
    // Load available account levels
    this.reportService.getAccountLevels().subscribe({
      next: (response) => {
        if (response.success) {
          this.availableLevels.set(response.data.levels);
        }
      },
      error: () => {
        // Fallback to default levels
        this.availableLevels.set([1, 2, 3, 4, 5]);
      }
    });

    // Load available date range
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
   * Generate the Trial Balance report
   */
  generateReport(): void {
    // Validate dates
    if (!this.filters.startDate || !this.filters.endDate) {
      this.state.set('error');
      this.errorMessage.set('Debe seleccionar las fechas de inicio y fin del período.');
      return;
    }

    if (new Date(this.filters.startDate) > new Date(this.filters.endDate)) {
      this.state.set('error');
      this.errorMessage.set('La fecha de inicio debe ser anterior o igual a la fecha de fin.');
      return;
    }

    this.state.set('loading');
    this.errorMessage.set('');

    const query: TrialBalanceQuery = {
      startDate: this.filters.startDate,
      endDate: this.filters.endDate,
      accountLevel: this.filters.accountLevel || undefined,
      includeInactive: this.filters.includeInactive,
      onlyWithMovements: this.filters.onlyWithMovements
    };

    this.reportService.getTrialBalance(query).subscribe({
      next: (response) => {
        if (response.success) {
          const data = response.data;
          this.entries.set(data.entries);
          this.summary.set(data.summary);
          this.generatedAt.set(data.generatedAt);

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
        console.error('Error generating trial balance:', error);
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
   * Export report to Excel
   */
  exportToExcel(): void {
    const entriesData = this.entries();
    const summaryData = this.summary();

    if (entriesData.length === 0) {
      return;
    }

    // Prepare data for Excel
    const excelData = entriesData.map(entry => ({
      'Código': entry.accountNumber,
      'Cuenta': entry.accountName,
      'Tipo': entry.accountType,
      'Nivel': entry.accountLevel,
      'Debe': entry.debitAmount,
      'Haber': entry.creditAmount,
      'Saldo': entry.balance,
      'Naturaleza': entry.balanceType === 'debit' ? 'Deudor' : 'Acreedor'
    }));

    // Add summary rows
    excelData.push({} as any); // Empty row
    excelData.push({
      'Código': '',
      'Cuenta': 'TOTALES',
      'Tipo': '',
      'Nivel': null as any,
      'Debe': summaryData?.totalDebits ?? 0,
      'Haber': summaryData?.totalCredits ?? 0,
      'Saldo': summaryData?.difference ?? 0,
      'Naturaleza': summaryData?.isBalanced ? 'CUADRADO' : 'DESCUADRADO'
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Código
      { wch: 40 }, // Cuenta
      { wch: 12 }, // Tipo
      { wch: 8 },  // Nivel
      { wch: 15 }, // Debe
      { wch: 15 }, // Haber
      { wch: 15 }, // Saldo
      { wch: 12 }  // Naturaleza
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balanza de Comprobación');

    // Generate filename with date range
    const filename = `balanza_comprobacion_${this.filters.startDate}_${this.filters.endDate}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Print report (uses browser print)
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
    this.filters.accountLevel = undefined;
    this.filters.includeInactive = false;
    this.filters.onlyWithMovements = true;
    this.state.set('idle');
    this.entries.set([]);
    this.summary.set(null);
  }

  /**
   * Get CSS class for account type badge
   */
  getAccountTypeClass(type: string): string {
    const typeClasses: Record<string, string> = {
      'Activo': 'type-activo',
      'Pasivo': 'type-pasivo',
      'Capital': 'type-capital',
      'Ingresos': 'type-ingresos',
      'Gastos': 'type-gastos',
      'Costos': 'type-costos'
    };
    return typeClasses[type] ?? 'type-default';
  }

  /**
   * Get CSS class for balance type
   */
  getBalanceClass(entry: TrialBalanceEntry): string {
    if (entry.balance === 0) return 'balance-zero';
    return entry.balanceType === 'debit' ? 'balance-debit' : 'balance-credit';
  }

  /**
   * Format date for display
   */
  private formatDate(dateStr: string): string {
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
  trackByAccountId(index: number, entry: TrialBalanceEntry): number {
    return entry.accountId;
  }
}
