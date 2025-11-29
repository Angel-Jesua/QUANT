import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService, UserDetails } from '../../shared/services/users.service';
import { SidebarComponent } from '../../dashboard/components/sidebar/sidebar.component';
import { API_BASE_URL } from '../../shared/constants/api.constants';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);

  user = signal<UserDetails | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  resolvedImageUrl = signal<string | null>(null);

  private readonly defaultImagePath = 'assets/images/default-avatar.png';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(parseInt(id, 10));
    } else {
      this.error.set('ID de usuario no válido');
      this.isLoading.set(false);
    }
  }

  loadUser(id: number) {
    this.usersService.getUserDetails(id).subscribe({
      next: (data) => {
        this.user.set(data);
        this.resolvedImageUrl.set(this.resolveImageUrl(data.profileImageUrl));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading user details:', err);
        this.error.set('Error al cargar los detalles del usuario');
        this.isLoading.set(false);
      }
    });
  }

  private resolveImageUrl(path?: string | null): string {
    if (!path) {
      return this.defaultImagePath;
    }

    // If it's already an absolute URL, return it as-is
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    // For uploaded images, use the backend server URL
    const normalized = path.replace(/^\/+/g, '');
    const backendUrl = API_BASE_URL.replace('/api', ''); // Remove /api suffix
    return `${backendUrl}/${normalized}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== this.defaultImagePath) {
      img.src = this.defaultImagePath;
    }
  }

  goBack() {
    this.router.navigate(['/usuarios']);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
