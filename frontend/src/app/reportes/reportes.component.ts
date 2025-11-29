import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../dashboard/components/sidebar/sidebar.component';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  colorScheme: 'cyan' | 'blue' | 'navy';
  route: string;
  isActive: boolean;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportesComponent {
  readonly companyTitle = 'IURIS CONSULTUS S.A';
  readonly subtitle = 'Seleccione un estado financiero para ver más detalles';

  readonly reportCards: ReportCard[] = [
    {
      id: 'trial-balance',
      title: 'Balanza de Comprobación',
      description: 'Verificación de saldos deudores y acreedores',
      colorScheme: 'cyan',
      route: '/reportes/balanza-comprobacion',
      isActive: true
    },
    {
      id: 'balance-sheet',
      title: 'Balance General',
      description: 'Estado de situación financiera de la empresa',
      colorScheme: 'blue',
      route: '/reportes/balance-general',
      isActive: true
    },
    {
      id: 'income-statement',
      title: 'Estado de Resultado',
      description: 'Informe de ingreso, gastos y beneficios',
      colorScheme: 'navy',
      route: '/reportes/estado-resultado',
      isActive: true
    }
  ];

  constructor(private router: Router) {}

  navigateToReport(route: string): void {
    this.router.navigate([route]);
  }
}
