import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../dashboard/components/sidebar/sidebar.component';
import {
  StatisticsService,
  StatisticsQuery,
  StatisticsKPIs,
  BalanceSheetSummaryStats,
  IncomeStatementSummaryStats,
  TrialBalanceSummaryStats,
  ChartDataSets,
  PredictionQuery,
  ProjectionSet,
} from '../services/statistics.service';
import { IncomeExpenseBarChartComponent } from './components/income-expense-bar-chart/income-expense-bar-chart.component';
import { ExpensePieChartComponent } from './components/expense-pie-chart/expense-pie-chart.component';
import { EquityAreaChartComponent } from './components/equity-area-chart/equity-area-chart.component';
import { PredictionLineChartComponent } from './components/prediction-line-chart/prediction-line-chart.component';

type PageState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    DatePipe,
    SidebarComponent,
    IncomeExpenseBarChartComponent,
    ExpensePieChartComponent,
    EquityAreaChartComponent,
    PredictionLineChartComponent,
  ],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadisticasComponent implements OnInit {
  readonly companyTitle = 'IURIS CONSULTUS S.A';
  readonly pageTitle = 'Estadísticas Financieras';

  // State management
  state = signal<PageState>('idle');
  errorMessage = signal<string>('');

  // Statistics data
  kpis = signal<StatisticsKPIs | null>(null);
  balanceSheet = signal<BalanceSheetSummaryStats | null>(null);
  incomeStatement = signal<IncomeStatementSummaryStats | null>(null);
  trialBalance = signal<TrialBalanceSummaryStats | null>(null);
  chartData = signal<ChartDataSets | null>(null);
  generatedAt = signal<string>('');

  // Predictions data
  predictionState = signal<PageState>('idle');
  revenuePrediction = signal<ProjectionSet | null>(null);
  costsPrediction = signal<ProjectionSet | null>(null);
  expensesPrediction = signal<ProjectionSet | null>(null);
  hasInsufficientData = signal<boolean>(false);
  insufficientDataMessage = signal<string>('');
  selectedProjectionMonths = signal<3 | 6 | 12>(3);

  // Collapsible sections
  balanceSheetExpanded = signal<boolean>(false);
  incomeStatementExpanded = signal<boolean>(false);
  trialBalanceExpanded = signal<boolean>(false);

  // Filter form
  filters: StatisticsQuery = {
    startDate: '',
    endDate: '',
  };

  // Computed values
  hasData = computed(() => this.kpis() !== null);

  profitLossClass = computed(() => {
    const k = this.kpis();
    if (!k) return '';
    return k.isProfit ? 'profit' : 'loss';
  });

  constructor(
    private statisticsService: StatisticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeDates();
  }

  private initializeDates(): void {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.filters.startDate = this.toISODate(firstDayOfMonth);
    this.filters.endDate = this.toISODate(lastDayOfMonth);
  }

  generateStatistics(): void {
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

    const query: StatisticsQuery = {
      startDate: this.filters.startDate,
      endDate: this.filters.endDate,
    };

    this.statisticsService.getStatistics(query).subscribe({
      next: (response) => {
        if (response.success) {
          const data = response.data;
          this.kpis.set(data.kpis);
          this.balanceSheet.set(data.balanceSheet);
          this.incomeStatement.set(data.incomeStatement);
          this.trialBalance.set(data.trialBalance);
          this.chartData.set(data.charts);
          this.generatedAt.set(data.generatedAt);
          this.state.set('success');

          // Load predictions after statistics
          this.loadPredictions();
        } else {
          this.state.set('error');
          this.errorMessage.set(response.error?.message ?? 'Error al generar estadísticas.');
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error generating statistics:', error);
        this.state.set('error');
        this.errorMessage.set(
          error.error?.error?.message ??
            'Error de conexión. Por favor, verifique su conexión e intente nuevamente.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  private loadPredictions(): void {
    this.predictionState.set('loading');

    const query: PredictionQuery = {
      baseDate: this.filters.endDate,
      months: 12,
    };

    this.statisticsService.getPredictions(query).subscribe({
      next: (response) => {
        if (response.success) {
          const data = response.data;
          this.revenuePrediction.set(data.revenue);
          this.costsPrediction.set(data.costs);
          this.expensesPrediction.set(data.expenses);
          this.hasInsufficientData.set(data.hasInsufficientData);
          this.insufficientDataMessage.set(data.insufficientDataMessage ?? '');
          this.predictionState.set('success');
        } else {
          this.predictionState.set('error');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.predictionState.set('error');
        this.cdr.markForCheck();
      },
    });
  }

  resetFilters(): void {
    this.initializeDates();
    this.state.set('idle');
    this.kpis.set(null);
    this.balanceSheet.set(null);
    this.incomeStatement.set(null);
    this.trialBalance.set(null);
    this.chartData.set(null);
    this.revenuePrediction.set(null);
    this.costsPrediction.set(null);
    this.expensesPrediction.set(null);
    this.predictionState.set('idle');
  }

  toggleBalanceSheet(): void {
    this.balanceSheetExpanded.update((v) => !v);
  }

  toggleIncomeStatement(): void {
    this.incomeStatementExpanded.update((v) => !v);
  }

  toggleTrialBalance(): void {
    this.trialBalanceExpanded.update((v) => !v);
  }

  selectProjectionMonths(months: 3 | 6 | 12): void {
    this.selectedProjectionMonths.set(months);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private toISODate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  trackByCategory(index: number, item: { categoryName: string }): string {
    return item.categoryName;
  }

  trackByAccountId(index: number, item: { accountId: number }): number {
    return item.accountId;
  }
}
