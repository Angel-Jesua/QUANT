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
import {
  ProjectionSet,
  getConfidenceLevel,
  getConfidenceLevelLabel,
} from '../../../services/statistics.service';

@Component({
  selector: 'app-prediction-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prediction-line-chart.component.html',
  styleUrls: ['./prediction-line-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictionLineChartComponent implements AfterViewInit, OnChanges {
  @Input() data: ProjectionSet | null = null;
  @Input() title = 'Predicción';
  @Input() projectionMonths: 3 | 6 | 12 = 3;
  @Input() height = 300;
  @Input() hasInsufficientData = false;
  @Input() insufficientDataMessage = '';

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private readonly colors = {
    historical: '#0062FF',
    projected: '#10B981',
    bounds: 'rgba(16, 185, 129, 0.15)',
    grid: '#E5E7EB',
    text: '#6B7280',
  };

  get confidenceLevel(): string {
    return this.data ? getConfidenceLevel(this.data.confidence) : 'low';
  }

  get confidenceLabel(): string {
    return this.data ? getConfidenceLevelLabel(this.data.confidence) : 'Baja';
  }

  get hasData(): boolean {
    return !!this.data && this.data.historical.length > 0;
  }

  ngAfterViewInit(): void {
    this.initCanvas();
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['projectionMonths']) && this.ctx) {
      this.draw();
    }
  }

  private initCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      this.ctx = canvas.getContext('2d')!;
    }
  }

  private draw(): void {
    if (!this.ctx || !this.data || this.hasInsufficientData) return;

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 20, bottom: 50, left: 70 };

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Get projections based on selected months
    const projections = this.getProjections();
    const allData = [...this.data.historical, ...projections];

    if (allData.length === 0) return;

    // Calculate scale
    const allValues = [
      ...this.data.historical.map((d) => d.value),
      ...projections.map((d) => d.value),
      ...projections.map((d) => d.upperBound),
      ...projections.map((d) => d.lowerBound),
    ];
    const minValue = Math.min(...allValues) * 0.9;
    const maxValue = Math.max(...allValues) * 1.1;
    const valueRange = maxValue - minValue;

    // Draw grid
    this.drawGrid(padding, chartWidth, chartHeight, minValue, maxValue);

    const totalPoints = allData.length;
    const historicalCount = this.data.historical.length;

    // Calculate historical points
    const historicalPoints = this.data.historical.map((item, index) => ({
      x: padding.left + (index / (totalPoints - 1)) * chartWidth,
      y: padding.top + chartHeight - ((item.value - minValue) / valueRange) * chartHeight,
    }));

    // Calculate projection points with bounds
    const projectionPoints = projections.map((item, index) => {
      const x = padding.left + ((historicalCount + index) / (totalPoints - 1)) * chartWidth;
      return {
        x,
        y: padding.top + chartHeight - ((item.value - minValue) / valueRange) * chartHeight,
        upper: padding.top + chartHeight - ((item.upperBound - minValue) / valueRange) * chartHeight,
        lower: padding.top + chartHeight - ((item.lowerBound - minValue) / valueRange) * chartHeight,
      };
    });

    // Draw confidence bounds
    if (projectionPoints.length > 0) {
      this.ctx.beginPath();
      const startX = historicalPoints.length > 0
        ? historicalPoints[historicalPoints.length - 1].x
        : projectionPoints[0].x;
      const startY = historicalPoints.length > 0
        ? historicalPoints[historicalPoints.length - 1].y
        : projectionPoints[0].upper;

      this.ctx.moveTo(startX, startY);
      projectionPoints.forEach((p) => this.ctx.lineTo(p.x, p.upper));
      for (let i = projectionPoints.length - 1; i >= 0; i--) {
        this.ctx.lineTo(projectionPoints[i].x, projectionPoints[i].lower);
      }
      this.ctx.lineTo(startX, startY);
      this.ctx.closePath();
      this.ctx.fillStyle = this.colors.bounds;
      this.ctx.fill();
    }

    // Draw historical line
    if (historicalPoints.length > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(historicalPoints[0].x, historicalPoints[0].y);
      historicalPoints.forEach((p) => this.ctx.lineTo(p.x, p.y));
      this.ctx.strokeStyle = this.colors.historical;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      // Draw historical points
      historicalPoints.forEach((p) => {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.strokeStyle = this.colors.historical;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      });
    }

    // Draw projection line
    if (projectionPoints.length > 0) {
      this.ctx.beginPath();
      const startPoint = historicalPoints.length > 0
        ? historicalPoints[historicalPoints.length - 1]
        : projectionPoints[0];
      this.ctx.moveTo(startPoint.x, startPoint.y);
      projectionPoints.forEach((p) => this.ctx.lineTo(p.x, p.y));
      this.ctx.strokeStyle = this.colors.projected;
      this.ctx.lineWidth = 2.5;
      this.ctx.setLineDash([6, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw projection points
      projectionPoints.forEach((p) => {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.strokeStyle = this.colors.projected;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      });
    }

    // Draw x-axis labels
    allData.forEach((item, index) => {
      const x = padding.left + (index / (totalPoints - 1)) * chartWidth;
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '10px Poppins, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.formatMonth(item.month), x, height - padding.bottom + 20);
    });
  }

  private getProjections() {
    if (!this.data) return [];
    switch (this.projectionMonths) {
      case 3: return this.data.projections.threeMonths;
      case 6: return this.data.projections.sixMonths;
      case 12: return this.data.projections.twelveMonths;
      default: return this.data.projections.threeMonths;
    }
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

      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(padding.left + chartWidth, y);
      this.ctx.stroke();

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
