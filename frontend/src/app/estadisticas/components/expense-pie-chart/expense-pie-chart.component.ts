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
import { CategoryDistribution } from '../../../services/statistics.service';

@Component({
  selector: 'app-expense-pie-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expense-pie-chart.component.html',
  styleUrls: ['./expense-pie-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensePieChartComponent implements AfterViewInit, OnChanges {
  @Input() data: CategoryDistribution[] = [];
  @Input() size = 280;

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private readonly defaultColors = [
    '#0062FF', '#57C0FB', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316',
  ];

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
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.5; // Donut chart

    // Clear canvas
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startAngle = -Math.PI / 2; // Start from top

    this.data.forEach((item, index) => {
      const sliceAngle = (item.percentage / 100) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const color = item.color || this.defaultColors[index % this.defaultColors.length];

      // Draw slice
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fillStyle = color;
      this.ctx.fill();

      // Draw inner circle (donut hole)
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();

      startAngle = endAngle;
    });

    // Draw center text
    this.ctx.fillStyle = '#03055E';
    this.ctx.font = 'bold 14px Poppins, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Gastos', centerX, centerY - 8);
    this.ctx.font = '12px Poppins, sans-serif';
    this.ctx.fillStyle = '#6B7280';
    this.ctx.fillText('por categoría', centerX, centerY + 10);
  }

  getColor(index: number, item: CategoryDistribution): string {
    return item.color || this.defaultColors[index % this.defaultColors.length];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
