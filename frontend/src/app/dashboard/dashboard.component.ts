import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { MetricCardComponent } from './components/metric-card/metric-card.component';
import { IncomeExpenseChartComponent } from './components/income-expense-chart/income-expense-chart.component';

interface MetricData {
  title: string;
  value: string;
  chartColor: string;
}

interface ChartDataPoint {
  period: string;
  income: number;
  expense: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    MetricCardComponent,
    IncomeExpenseChartComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly monthlyIncome: MetricData = {
    title: 'Ingreso Mensual',
    value: '156,445 $',
    chartColor: '#0062FF'
  };

  readonly monthlyExpense: MetricData = {
    title: 'Gasto Mensual',
    value: '87,840 $',
    chartColor: '#FF8D28'
  };

  readonly chartData: ChartDataPoint[] = [
    { period: '01', income: 121786, expense: 89773 },
    { period: '02', income: 50117, expense: 5991 },
    { period: '03', income: 132270, expense: 147615 },
    { period: '04', income: 20334, expense: 2886 },
    { period: '05', income: 41967, expense: 56288 },
    { period: '06', income: 2887, expense: 19630 }
  ];
}
