import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ChartDataPoint {
  period: string;
  income: number;
  expense: number;
}

@Component({
  selector: 'app-income-expense-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './income-expense-chart.component.html',
  styleUrls: ['./income-expense-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeExpenseChartComponent {
  @Input() data: ChartDataPoint[] = [];

  readonly chartTitle = 'Gráfico Ingresos vs Gastos';
  readonly chartSubtitle = 'Registro del 1-11 Nov, 2025';
}
