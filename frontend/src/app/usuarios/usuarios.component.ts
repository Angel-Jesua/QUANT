import { Component, ChangeDetectionStrategy, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../dashboard/components/sidebar/sidebar.component';
import { UsersService, User, CreateUserData, UpdateUserData } from '../shared/services/users.service';
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
  private readonly router = inject(Router);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchTerm = signal<string>('');
  
  // Filter signals
  readonly filterDateStart = signal<string | null>(null);
  readonly filterDateEnd = signal<string | null>(null);
  readonly filterRole = signal<string>('');
  readonly filterStatus = signal<string>('');
  readonly showFilters = signal<boolean>(false);

  // Sort signals
  readonly sortBy = signal<'date' | 'username' | 'role' | 'status' | 'lastAccess'>('date');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 4;
  readonly selectedPhoto = signal<string | null>(null);
  readonly photoFile = signal<File | null>(null);
  
  // Edit mode signals
  readonly isEditing = signal<boolean>(false);
  readonly editingUserId = signal<number | null>(null);
  
  registrationForm: FormGroup;
  showForm = signal<boolean>(true);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  readonly activeUsersCount = computed(() => 
    this.users().filter(user => user.isActive).length
  );

  readonly hasActiveFilters = computed(() => {
    return !!(this.searchTerm() || this.filterDateStart() || this.filterDateEnd() || this.filterRole() || this.filterStatus());
  });

  readonly filteredUsers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const dateStart = this.filterDateStart();
    const dateEnd = this.filterDateEnd();
    const role = this.filterRole().toLowerCase();
    const status = this.filterStatus();
    
    const allUsers = this.users();
    
    return allUsers.filter(user => {
      // Text search
      const matchesSearch = !search || 
        user.fullName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search);

      // Role filter
      const matchesRole = !role || user.role.toLowerCase().includes(role);
      
      // Status filter
      const matchesStatus = !status || 
        (status === 'active' && user.isActive) || 
        (status === 'inactive' && !user.isActive);

      // Date range filter
      let matchesDate = true;
      if (dateStart || dateEnd) {
        const userDate = new Date(user.createdAt).getTime();
        if (dateStart && userDate < new Date(dateStart).getTime()) matchesDate = false;
        // Add 1 day to end date to include the selected day fully
        if (dateEnd) {
          const endDate = new Date(dateEnd);
          endDate.setDate(endDate.getDate() + 1);
          if (userDate >= endDate.getTime()) matchesDate = false;
        }
      }

      return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });
  });

  readonly sortedUsers = computed(() => {
    const users = [...this.filteredUsers()];
    const sortKey = this.sortBy();
    const order = this.sortOrder() === 'asc' ? 1 : -1;
    
    return users.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'username':
          comparison = a.username.localeCompare(b.username);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'status':
          comparison = (a.isActive === b.isActive) ? 0 : (a.isActive ? -1 : 1);
          break;
        case 'lastAccess':
           const dateA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
           const dateB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
           comparison = dateA - dateB;
           break;
      }
      return comparison * order;
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

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value as any);
  }

  toggleSortOrder(): void {
    this.sortOrder.update(order => order === 'asc' ? 'desc' : 'asc');
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  onDateStartChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterDateStart.set(input.value || null);
    this.currentPage.set(1);
  }

  onDateEndChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterDateEnd.set(input.value || null);
    this.currentPage.set(1);
  }

  onRoleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterRole.set(select.value);
    this.currentPage.set(1);
  }

  onStatusChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterStatus.set(select.value);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filterDateStart.set(null);
    this.filterDateEnd.set(null);
    this.filterRole.set('');
    this.filterStatus.set('');
    this.currentPage.set(1);
  }

  resetSort(): void {
    this.sortBy.set('date');
    this.sortOrder.set('desc');
  }

  startEdit(user: User): void {
    this.isEditing.set(true);
    this.editingUserId.set(user.id);
    this.showForm.set(true);

    // Remove validators for fields not needed in edit or not available
    this.registrationForm.get('password')?.clearValidators();
    this.registrationForm.get('password')?.updateValueAndValidity();
    
    this.registrationForm.get('cedula')?.clearValidators();
    this.registrationForm.get('cedula')?.updateValueAndValidity();

    this.registrationForm.patchValue({
      username: user.username,
      email: user.email,
      rol: user.role,
      cedula: '000-000000-0000A', // Dummy value
      password: ''
    });
    
    // Handle profile image if exists
    if (user.profileImageUrl) {
      this.selectedPhoto.set(user.profileImageUrl);
    } else {
      this.selectedPhoto.set(null);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editingUserId.set(null);
    this.registrationForm.reset();
    this.selectedPhoto.set(null);
    this.photoFile.set(null);
    
    // Restore validators
    this.registrationForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.registrationForm.get('password')?.updateValueAndValidity();
    
    this.registrationForm.get('cedula')?.setValidators([Validators.required, Validators.pattern(/^\d{3}-\d{6}-\d{4}[A-Z]$/)]);
    this.registrationForm.get('cedula')?.updateValueAndValidity();
  }

  private finalizeUpdate(user: User, customSuccessMessage?: string): void {
    this.isLoading.set(false);
    this.successMessage.set(customSuccessMessage || 'Usuario actualizado exitosamente');
    this.cancelEdit();
    this.loadUsers();
    
    const currentProfile = this.profileService.snapshot;
    if (currentProfile && currentProfile.id === user.id) {
      this.profileService.loadProfile(true).subscribe();
    }
    
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const formData = this.registrationForm.value;

      if (this.isEditing()) {
        const userId = this.editingUserId();
        if (!userId) return;

        const updateData: UpdateUserData = {
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          fullName: formData.username.trim(),
          role: formData.rol.toLowerCase()
        };

        this.usersService.updateUser(userId, updateData).subscribe({
          next: (updatedUser) => {
             const photoFile = this.photoFile();
             if (photoFile) {
               this.usersService.uploadProfileImage(updatedUser.id, photoFile).subscribe({
                 next: (userWithPhoto) => {
                   this.finalizeUpdate(userWithPhoto);
                 },
                 error: (error) => {
                   console.error('Error uploading profile image:', error);
                   this.finalizeUpdate(updatedUser, 'Usuario actualizado, pero hubo un error al subir la imagen');
                 }
               });
             } else {
               this.finalizeUpdate(updatedUser);
             }
          },
          error: (error) => {
            this.isLoading.set(false);
            console.error('Error updating user:', error);
            this.errorMessage.set(error.error?.message || error.error?.error || 'Error al actualizar usuario');
          }
        });
      } else {
        const userData: CreateUserData = {
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          fullName: formData.username.trim(),
          role: formData.rol.toLowerCase()
        };

        this.usersService.createUser(userData).subscribe({
          next: (response) => {
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
                  
                  const currentProfile = this.profileService.snapshot;
                  if (currentProfile && currentProfile.id === updatedUser.id) {
                    this.profileService.loadProfile(true).subscribe();
                  }
                  
                  setTimeout(() => this.successMessage.set(''), 3000);
                },
                error: (error) => {
                  this.isLoading.set(false);
                  console.error('Error uploading profile image:', error);
                  this.successMessage.set('Usuario registrado, pero hubo un error al subir la imagen');
                  this.registrationForm.reset();
                  this.selectedPhoto.set(null);
                  this.photoFile.set(null);
                  this.loadUsers();
                  setTimeout(() => this.successMessage.set(''), 3000);
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
            console.error('Error creating user:', error);
            this.errorMessage.set(error.error?.message || 'Error al registrar usuario');
          }
        });
      }
    } else {
      this.registrationForm.markAllAsTouched();
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
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

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  showCamera = signal<boolean>(false);
  cameraError = signal<string>('');
  private stream: MediaStream | null = null;

  async onTakePhoto(): Promise<void> {
    this.showCamera.set(true);
    this.cameraError.set('');
    await this.initCamera();
  }

  async initCamera(): Promise<void> {
    try {
      // Verificar si el navegador soporta mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });

      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        // Reproducir el video una vez que el stream esté listo
        await this.videoElement.nativeElement.play();
      }
    } catch (err: any) {
      let message = 'No se pudo acceder a la cámara.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Permiso de cámara denegado. Por favor permite el acceso.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No se encontró ninguna cámara en el dispositivo.';
      }
      
      this.cameraError.set(message);
      console.error('Error accessing camera:', err);
    }
  }

  capturePhoto(): void {
    if (!this.videoElement || !this.canvasElement) return;
    
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    
    // Asegurar que el canvas tenga las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      // Dibujar el frame actual del video en el canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convertir a base64 para la vista previa
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      this.selectedPhoto.set(dataUrl);
      
      // Convertir a Blob/File para la subida
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
          this.photoFile.set(file);
        }
      }, 'image/jpeg', 0.9);
      
      // Cerrar la cámara después de tomar la foto
      this.closeCamera();
    }
  }

  closeCamera(): void {
    // Detener todos los tracks del stream (video/audio)
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.showCamera.set(false);
    this.cameraError.set('');
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
    this.router.navigate(['/usuarios', user.id]);
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
