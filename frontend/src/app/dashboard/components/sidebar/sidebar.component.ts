import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  isActive: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly userName = 'Angel Aguilar';
  readonly userGreeting = '¡Bienvenida!';
  readonly userAvatarUrl = 'https://api.builder.io/api/v1/image/assets/TEMP/db7f25fee5708e20ddab1540ab1ee68f633c1e43?width=452';

  readonly menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart', route: '/dashboard', isActive: true },
    { id: 'users', label: 'Usuarios', icon: 'profile', route: '/usuarios', isActive: false },
    { id: 'clients', label: 'Clientes', icon: 'document', route: '/clientes', isActive: false },
    { id: 'accounts', label: 'Cuentas', icon: 'bookmark', route: '/cuentas', isActive: false },
    { id: 'reports', label: 'Reportes', icon: 'keyboard', route: '/reportes', isActive: false },
    { id: 'entries', label: 'Asientos', icon: 'tab', route: '/asientos', isActive: false },
    { id: 'invoices', label: 'Facturas', icon: 'checkbox', route: '/facturas', isActive: false },
    { id: 'statistics', label: 'Estadísticas', icon: 'archive', route: '/estadisticas', isActive: false }
  ];
}
