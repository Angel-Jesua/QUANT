import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-card.component.html',
  styleUrls: ['./metric-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricCardComponent {
  @Input() title = '';
  @Input() value = '';
  @Input() chartColor = '#0062FF';
}
