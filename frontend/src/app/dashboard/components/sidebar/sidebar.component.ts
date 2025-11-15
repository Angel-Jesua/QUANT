import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserProfileService, UserProfile } from '../../../shared/services/user-profile.service';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
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
  private readonly profileService = inject(UserProfileService);
  readonly user$ = this.profileService.profile$;
  readonly greetingLabel = '¡Bienvenido(a)!';
  readonly defaultAvatarSrc = '/images/default-avatar.svg';

  readonly menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', route: '/dashboard' },
    { id: 'users', label: 'Usuarios', icon: 'account_circle', route: '/usuarios' },
    { id: 'clients', label: 'Clientes', icon: 'article', route: '/clientes' },
    { id: 'accounts', label: 'Cuentas', icon: 'table_view', route: '/cuentas' },
    { id: 'reports', label: 'Reportes', icon: 'account_balance', route: '/reportes' },
    { id: 'entries', label: 'Asientos', icon: 'book', route: '/asientos' },
    { id: 'invoices', label: 'Facturas', icon: 'fact_check', route: '/facturas' },
    { id: 'statistics', label: 'Estadísticas', icon: 'auto_graph', route: '/estadisticas' }
  ];

  onAvatarError(event: Event, user: UserProfile): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) {
      return;
    }

    if (user.profileImageStatus === 'custom' && img.dataset['fallbackApplied'] !== 'true') {
      img.dataset['fallbackApplied'] = 'true';
      img.src = this.defaultAvatarSrc;
      return;
    }

    this.hideAvatar(img);
  }

  private hideAvatar(img: HTMLImageElement): void {
    img.style.display = 'none';
    const container = img.closest('.avatar-container');
    if (container) {
      container.classList.add('empty');
    }
  }
}
