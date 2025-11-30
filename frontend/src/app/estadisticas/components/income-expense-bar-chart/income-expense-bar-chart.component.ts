import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncomeExpenseData } from '../../../services/statistics.service';

@Component({
  selector: 'app-income-expense-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './income-expense-bar-chart.component.html',
  styleUrls: ['./income-expense-bar-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeExpenseBarChartComponent implements AfterViewInit, OnChanges {
  @Input() data: IncomeExpenseData[] = [];
  @Input() height = 300;

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private readonly colors = {
    income: '#10B981',
    expense: '#EF4444',
    grid: '#E5E7EB',
    text: '#6B7280',
    label: '#374151',
  };

  ngAfterViewInit(): void {
    this.initCanvas();
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.ctx) {
      this.draw();
    }
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
  }

  private draw(): void {
    if (!this.ctx || !this.data.length) return;

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 20, bottom: 60, left: 70 };

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate max value for scale
    const maxValue = Math.max(
      ...this.data.map((d) => Math.max(d.income, d.expense))
    );
    const scale = chartHeight / (maxValue * 1.1);

    // Draw grid lines
    this.drawGrid(padding, chartWidth, chartHeight, maxValue);

    // Draw bars
    const groupWidth = chartWidth / this.data.length;
    const barWidth = groupWidth * 0.35;
    const gap = groupWidth * 0.1;

    this.data.forEach((item, index) => {
      const x = padding.left + index * groupWidth + gap;

      // Income bar
      const incomeHeight = item.income * scale;
      this.ctx.fillStyle = this.colors.income;
      this.ctx.fillRect(
        x,
        padding.top + chartHeight - incomeHeight,
        barWidth,
        incomeHeight
      );

      // Expense bar
      const expenseHeight = item.expense * scale;
      this.ctx.fillStyle = this.colors.expense;
      this.ctx.fillRect(
        x + barWidth + 4,
        padding.top + chartHeight - expenseHeight,
        barWidth,
        expenseHeight
      );

      // Month label
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '11px Poppins, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        this.formatMonth(item.month),
        x + barWidth + 2,
        height - padding.bottom + 20
      );
    });

    // Draw legend
    this.drawLegend(width, padding.top);
  }

  private drawGrid(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    maxValue: number
  ): void {
    const gridLines = 5;
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      const value = maxValue * (1 - i / gridLines);

      // Grid line
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(padding.left + chartWidth, y);
      this.ctx.stroke();

      // Y-axis label
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '11px Poppins, sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(this.formatCurrency(value), padding.left - 10, y + 4);
    }
  }

  private drawLegend(width: number, top: number): void {
    const legendX = width - 150;
    const legendY = top - 20;

    // Income legend
    this.ctx.fillStyle = this.colors.income;
    this.ctx.fillRect(legendX, legendY, 12, 12);
    this.ctx.fillStyle = this.colors.label;
    this.ctx.font = '12px Poppins, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Ingresos', legendX + 18, legendY + 10);

    // Expense legend
    this.ctx.fillStyle = this.colors.expense;
    this.ctx.fillRect(legendX + 80, legendY, 12, 12);
    this.ctx.fillStyle = this.colors.label;
    this.ctx.fillText('Gastos', legendX + 98, legendY + 10);
  }

  private formatMonth(month: string): string {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const [year, m] = month.split('-');
    return `${months[parseInt(m, 10) - 1]} ${year.slice(2)}`;
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
}
