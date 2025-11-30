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
import { EquityDataPoint } from '../../../services/statistics.service';

@Component({
  selector: 'app-equity-area-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './equity-area-chart.component.html',
  styleUrls: ['./equity-area-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquityAreaChartComponent implements AfterViewInit, OnChanges {
  @Input() data: EquityDataPoint[] = [];
  @Input() height = 280;

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private readonly colors = {
    line: '#0062FF',
    fill: 'rgba(0, 98, 255, 0.15)',
    grid: '#E5E7EB',
    text: '#6B7280',
    point: '#0062FF',
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
    const padding = { top: 30, right: 20, bottom: 50, left: 70 };

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate scale
    const values = this.data.map((d) => d.equity);
    const minValue = Math.min(...values) * 0.9;
    const maxValue = Math.max(...values) * 1.1;
    const valueRange = maxValue - minValue;

    // Draw grid
    this.drawGrid(padding, chartWidth, chartHeight, minValue, maxValue);

    // Calculate points
    const points = this.data.map((item, index) => ({
      x: padding.left + (index / (this.data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((item.equity - minValue) / valueRange) * chartHeight,
    }));

    // Draw area fill
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, padding.top + chartHeight);
    points.forEach((point) => this.ctx.lineTo(point.x, point.y));
    this.ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
    this.ctx.closePath();
    this.ctx.fillStyle = this.colors.fill;
    this.ctx.fill();

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    points.forEach((point) => this.ctx.lineTo(point.x, point.y));
    this.ctx.strokeStyle = this.colors.line;
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // Draw points
    points.forEach((point) => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
      this.ctx.strokeStyle = this.colors.point;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });

    // Draw x-axis labels
    this.data.forEach((item, index) => {
      const x = padding.left + (index / (this.data.length - 1)) * chartWidth;
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '11px Poppins, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.formatMonth(item.month), x, height - padding.bottom + 20);
    });
  }

  private drawGrid(
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    minValue: number,
    maxValue: number
  ): void {
    const gridLines = 5;
    const valueRange = maxValue - minValue;

    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      const value = maxValue - (valueRange / gridLines) * i;

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
