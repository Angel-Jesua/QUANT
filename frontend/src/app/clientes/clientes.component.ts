import { Component, ChangeDetectionStrategy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../dashboard/components/sidebar/sidebar.component';
import { ClientService, Client, CreateClientDTO } from '../services/client.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ReactiveFormsModule, FormsModule, CurrencyPipe],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientService = inject(ClientService);
  private readonly router = inject(Router);

  readonly clientes = signal<Client[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchTerm = signal<string>('');
  readonly sortBy = signal<string>('');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');
  
  // Filter signals
  readonly filterDateStart = signal<string | null>(null);
  readonly filterDateEnd = signal<string | null>(null);
  readonly filterStatus = signal<string>('');
  readonly filterCountry = signal<string>('');
  readonly showFilters = signal<boolean>(false);

  readonly currentPage = signal<number>(1);
  readonly pageSize = 4;
  
  // Pagination state
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(0);
  
  readonly editingClientId = signal<number | null>(null);

  // Modal signals
  readonly showViewModal = signal<boolean>(false);
  readonly selectedClient = signal<Client | null>(null);
  readonly isPasswordVerified = signal<boolean>(false);
  readonly isVerifying = signal<boolean>(false);
  readonly viewModalError = signal<string>('');
  readonly decryptedClientData = signal<{ email?: string; phone?: string; address?: string } | null>(null);
  verificationPassword = '';

  registrationForm: FormGroup;
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  readonly activeClientesCount = computed(() => 
    this.clientes().filter(cliente => cliente.isActive).length
  );

  readonly hasActiveFilters = computed(() => {
    return !!(this.searchTerm() || this.filterDateStart() || this.filterDateEnd() || this.filterStatus() || this.filterCountry());
  });

  readonly paginatedData = computed(() => {
    return {
      clientes: this.clientes(),
      total: this.totalItems(),
      page: this.currentPage(),
      pageSize: this.pageSize,
      totalPages: this.totalPages()
    };
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    range.push(1);
    for (let i = current - delta; i <= current + delta; i++) {
      if (i < total && i > 1) {
        range.push(i);
      }
    }
    if (total > 1) range.push(total);

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  });

  constructor() {
    this.registrationForm = this.fb.group({
      nombre: ['', Validators.required],
      telefono: ['', Validators.required],
      pais: ['', Validators.required],
      contrato: [''],
      tipoCliente: [''],
      email: ['', [Validators.required, Validators.email]],
      ciudad: [''],
      limiteCredito: [''],
      ruc: ['', Validators.required],
      direccion: [''],
      clientCode: ['']
    });
  }

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.isLoading.set(true);
    
    const filters = {
      isActive: this.filterStatus() ? this.filterStatus() === 'active' : undefined,
      country: this.filterCountry() || undefined,
      startDate: this.filterDateStart() || undefined,
      endDate: this.filterDateEnd() || undefined
    };

    this.clientService.getClients(
      this.currentPage(), 
      this.pageSize, 
      this.searchTerm(),
      this.sortBy(),
      this.sortOrder(),
      filters
    )
      .subscribe({
        next: (response) => {
          this.clientes.set(response.data);
          this.totalItems.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading clients', err);
          this.errorMessage.set('Error al cargar clientes');
          this.isLoading.set(false);
        }
      });
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.currentPage.set(1);
    this.loadClients();
  }

  onSortChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    
    if (!value) {
      this.sortBy.set('');
      this.sortOrder.set('asc');
    } else {
      const [field, order] = value.split('-');
      this.sortBy.set(field);
      this.sortOrder.set(order as 'asc' | 'desc');
    }
    
    this.loadClients();
  }

  toggleFilters() {
    this.showFilters.update(v => !v);
  }

  onDateStartChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.filterDateStart.set(target.value);
    this.currentPage.set(1);
    this.loadClients();
  }

  onDateEndChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.filterDateEnd.set(target.value);
    this.currentPage.set(1);
    this.loadClients();
  }

  onStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.filterStatus.set(target.value);
    this.currentPage.set(1);
    this.loadClients();
  }

  onCountryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.filterCountry.set(target.value);
    this.currentPage.set(1);
    this.loadClients();
  }

  clearFilters() {
    this.filterDateStart.set(null);
    this.filterDateEnd.set(null);
    this.filterStatus.set('');
    this.filterCountry.set('');
    this.searchTerm.set('');
    this.currentPage.set(1);
    this.loadClients();
  }

  onSubmit() {
    if (this.registrationForm.valid) {
      this.isLoading.set(true);
      const formValue = this.registrationForm.value;
      
      const clientData: Partial<CreateClientDTO> = {
        taxId: formValue.ruc,
        name: formValue.nombre,
        email: formValue.email,
        phone: formValue.telefono,
        address: formValue.direccion,
        city: formValue.ciudad,
        country: formValue.pais,
        creditLimit: formValue.limiteCredito ? Number(formValue.limiteCredito) : 0,
        currencyId: 1
      };

      const editingId = this.editingClientId();

      if (editingId) {
        if (formValue.clientCode) {
          (clientData as any).clientCode = formValue.clientCode;
        }

        this.clientService.updateClient(editingId, clientData).subscribe({
          next: () => {
            this.successMessage.set('Cliente actualizado exitosamente');
            this.registrationForm.reset();
            this.editingClientId.set(null);
            this.loadClients();
            setTimeout(() => this.successMessage.set(''), 3000);
          },
          error: (err) => {
            console.error('Error updating client', err);
            this.errorMessage.set(err.error?.message || 'Error al actualizar cliente');
            this.isLoading.set(false);
            setTimeout(() => this.errorMessage.set(''), 3000);
          }
        });
      } else {
        const clientCode = formValue.clientCode || `CL-${Math.floor(Math.random() * 100000)}`;
        const newClient = { ...clientData, clientCode } as CreateClientDTO;

        this.clientService.createClient(newClient).subscribe({
          next: () => {
            this.successMessage.set('Cliente registrado exitosamente');
            this.registrationForm.reset();
            this.loadClients();
            setTimeout(() => this.successMessage.set(''), 3000);
          },
          error: (err) => {
            console.error('Error creating client', err);
            this.errorMessage.set(err.error?.message || 'Error al registrar cliente');
            this.isLoading.set(false);
            setTimeout(() => this.errorMessage.set(''), 3000);
          }
        });
      }
    } else {
      this.registrationForm.markAllAsTouched();
    }
  }

  onCancel() {
    this.registrationForm.reset();
    this.editingClientId.set(null);
  }

  toggleClienteStatus(cliente: Client) {
    // Implement status toggle
  }

  openViewModal(cliente: Client) {
    this.selectedClient.set(cliente);
    this.showViewModal.set(true);
    this.isPasswordVerified.set(false);
    this.viewModalError.set('');
    this.decryptedClientData.set(null);
    this.verificationPassword = '';
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.selectedClient.set(null);
    this.isPasswordVerified.set(false);
    this.viewModalError.set('');
    this.decryptedClientData.set(null);
    this.verificationPassword = '';
  }

  verifyPasswordAndShowDetails() {
    if (!this.verificationPassword.trim()) {
      this.viewModalError.set('Ingrese su contraseña');
      return;
    }

    const cliente = this.selectedClient();
    if (!cliente) return;

    this.isVerifying.set(true);
    this.viewModalError.set('');

    this.clientService.verifyAndGetClientDetails(cliente.id, this.verificationPassword)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.decryptedClientData.set({
              email: response.data.email,
              phone: response.data.phone,
              address: response.data.address
            });
            this.isPasswordVerified.set(true);
          } else {
            this.viewModalError.set(response.message || 'Error al verificar');
          }
          this.isVerifying.set(false);
        },
        error: (err) => {
          this.viewModalError.set(err.error?.message || 'Contraseña incorrecta');
          this.isVerifying.set(false);
        }
      });
  }

  viewCliente(cliente: Client) {
    this.router.navigate(['/clientes', cliente.id]);
  }

  editCliente(cliente: Client) {
    this.editingClientId.set(cliente.id);
    this.registrationForm.patchValue({
      nombre: cliente.name,
      telefono: cliente.phone,
      pais: cliente.country,
      email: cliente.email,
      ciudad: cliente.city,
      limiteCredito: cliente.creditLimit,
      ruc: cliente.taxId,
      direccion: cliente.address,
      clientCode: cliente.clientCode
    });

    // Scroll to form
    const formElement = document.querySelector('.registration-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadClients();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadClients();
    }
  }

  goToPage(page: number | string) {
    if (typeof page === 'number') {
      this.currentPage.set(page);
      this.loadClients();
    }
  }

  isNumber(val: any): boolean {
    return typeof val === 'number';
  }
}
