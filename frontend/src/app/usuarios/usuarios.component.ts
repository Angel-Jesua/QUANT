import { Component, ChangeDetectionStrategy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../dashboard/components/sidebar/sidebar.component';
import { UsersService, User, CreateUserData } from '../shared/services/users.service';
import { UserProfileService } from '../shared/services/user-profile.service';

interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuariosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly profileService = inject(UserProfileService);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchTerm = signal<string>('');
  readonly sortBy = signal<'fecha' | 'nombre' | 'email'>('fecha');
  readonly currentPage = signal<number>(1);
  readonly pageSize = 4;
  readonly selectedPhoto = signal<string | null>(null);
  readonly photoFile = signal<File | null>(null);
  
  registrationForm: FormGroup;
  showForm = signal<boolean>(true);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  readonly activeUsersCount = computed(() => 
    this.users().filter(user => user.isActive).length
  );

  readonly filteredUsers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const allUsers = this.users();
    
    if (!search) return allUsers;
    
    return allUsers.filter(user =>
      user.fullName.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.username.toLowerCase().includes(search)
    );
  });

  readonly sortedUsers = computed(() => {
    const users = [...this.filteredUsers()];
    const sortKey = this.sortBy();
    
    return users.sort((a, b) => {
      if (sortKey === 'fecha') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortKey === 'nombre') {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortKey === 'email') {
        return a.email.localeCompare(b.email);
      }
      return 0;
    });
  });

  readonly paginatedData = computed((): PaginatedUsers => {
    const allUsers = this.sortedUsers();
    const page = this.currentPage();
    const size = this.pageSize;
    const start = (page - 1) * size;
    const end = start + size;
    
    return {
      users: allUsers.slice(start, end),
      total: allUsers.length,
      page,
      pageSize: size,
      totalPages: Math.ceil(allUsers.length / size)
    };
  });

  readonly pageNumbers = computed(() => {
    const total = this.paginatedData().totalPages;
    const current = this.currentPage();
    const pages: (number | string)[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    
    return pages;
  });

  constructor() {
    this.registrationForm = this.fb.group({
      cedula: ['', [Validators.required, Validators.pattern(/^\d{3}-\d{6}-\d{4}[A-Z]$/)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      rol: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.usersService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage.set('Error al cargar usuarios');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  onSortChange(sortKey: 'fecha' | 'nombre' | 'email'): void {
    this.sortBy.set(sortKey);
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const formData = this.registrationForm.value;
      const userData: CreateUserData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.username.trim(),
        role: formData.rol.toLowerCase()
      };

      this.usersService.createUser(userData).subscribe({
        next: (response) => {
          // If there's a profile photo, upload it
          const photoFile = this.photoFile();
          if (photoFile && response.data?.id) {
            this.usersService.uploadProfileImage(response.data.id, photoFile).subscribe({
              next: (updatedUser) => {
                this.isLoading.set(false);
                this.successMessage.set('Usuario y foto de perfil registrados exitosamente');
                this.registrationForm.reset();
                this.selectedPhoto.set(null);
                this.photoFile.set(null);
                this.loadUsers();
                
                // Refresh profile in sidebar if current user was updated
                const currentProfile = this.profileService.snapshot;
                if (currentProfile && currentProfile.id === updatedUser.id) {
                  this.profileService.loadProfile(true).subscribe();
                }
                
                setTimeout(() => this.successMessage.set(''), 3000);
              },
              error: (error) => {
                this.isLoading.set(false);
                console.error('Error uploading profile image:', error);
                this.errorMessage.set('Usuario creado, pero falló la subida de la imagen');
                this.loadUsers();
                setTimeout(() => this.errorMessage.set(''), 3000);
              }
            });
          } else {
            this.isLoading.set(false);
            this.successMessage.set('Usuario registrado exitosamente');
            this.registrationForm.reset();
            this.selectedPhoto.set(null);
            this.photoFile.set(null);
            this.loadUsers();
            setTimeout(() => this.successMessage.set(''), 3000);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.error?.message || 'Error al registrar usuario');
          
          setTimeout(() => this.errorMessage.set(''), 5000);
        }
      });
    } else {
      this.markFormGroupTouched(this.registrationForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  onCancel(): void {
    this.registrationForm.reset();
    this.selectedPhoto.set(null);
    this.photoFile.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.photoFile.set(file);
      
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.selectedPhoto.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  onTakePhoto(): void {
    console.log('Activar cámara para tomar foto');
  }

  toggleUserStatus(user: User): void {
    const updatedStatus = !user.isActive;
    this.usersService.updateUser(user.id, { isActive: updatedStatus }).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error updating user status:', error);
        this.errorMessage.set('Error al actualizar estado del usuario');
        setTimeout(() => this.errorMessage.set(''), 3000);
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.paginatedData().totalPages) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    const totalPages = this.paginatedData().totalPages;
    if (this.currentPage() < totalPages) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  isNumber(value: string | number): value is number {
    return typeof value === 'number';
  }

  viewUser(user: User): void {
    console.log('View user:', user);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    
    return `${day}-${month}-${year}, ${displayHours}:${minutes} ${ampm}`;
  }

  calculateActiveTime(lastLogin: string | undefined): string {
    if (!lastLogin) return 'N/A';
    
    const now = new Date();
    const login = new Date(lastLogin);
    const diffMs = now.getTime() - login.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} hrs, ${minutes} min`;
    }
    return `${minutes} min`;
  }
}
