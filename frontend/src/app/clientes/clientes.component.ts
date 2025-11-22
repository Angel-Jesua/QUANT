import { Component, ChangeDetectionStrategy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../dashboard/components/sidebar/sidebar.component';

interface Cliente {
  id: number;
  clienteRuc: string;
  numeroRuc: string;
  nombre: string;
  tipoCliente: string;
  tipoContrato: string;
  telefono: string;
  email: string;
  ciudad: string;
  pais: string;
  direccion: string;
  limiteCredito: number;
  isActive: boolean;
}

interface PaginatedClientes {
  clientes: Cliente[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ReactiveFormsModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly clientes = signal<Cliente[]>([
    {
      id: 1,
      clienteRuc: 'CL-2024-001',
      numeroRuc: 'J0310000023',
      nombre: 'Inversiones del Norte S.A.',
      tipoCliente: 'Jurídica',
      tipoContrato: 'Suministro',
      telefono: '+505 8888-2222',
      email: 'contacto@idnorte.com',
      ciudad: 'Managua',
      pais: 'Nicaragua',
      direccion: 'Km 5 Carretera Norte',
      limiteCredito: 50000,
      isActive: true
    }
  ]);

  readonly isLoading = signal<boolean>(false);
  readonly searchTerm = signal<string>('');
  readonly sortBy = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = 4;
  
  registrationForm: FormGroup;
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  readonly activeClientesCount = computed(() => 
    this.clientes().filter(cliente => cliente.isActive).length
  );

  readonly filteredClientes = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const allClientes = this.clientes();
    
    if (!search) return allClientes;
    
    return allClientes.filter(cliente => 
      cliente.nombre.toLowerCase().includes(search) ||
      cliente.clienteRuc.toLowerCase().includes(search) ||
      cliente.email.toLowerCase().includes(search) ||
      cliente.numeroRuc.toLowerCase().includes(search)
    );
  });

  readonly paginatedData = computed((): PaginatedClientes => {
    const allClientes = this.filteredClientes();
    const page = this.currentPage();
    const size = this.pageSize;
    const start = (page - 1) * size;
    const end = start + size;
    
    return {
      clientes: allClientes.slice(start, end),
      total: allClientes.length,
      page,
      pageSize: size,
      totalPages: Math.ceil(allClientes.length / size)
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
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      ruc: ['', [Validators.required]],
      tipoCliente: ['', [Validators.required]],
      ciudad: ['', [Validators.required]],
      pais: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      limiteCredito: ['', [Validators.required, Validators.min(0)]],
      contrato: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Future: Load clientes from API
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value);
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const formData = this.registrationForm.value;
      
      const nuevoCliente: Cliente = {
        id: this.clientes().length + 1,
        clienteRuc: `CL-2024-${String(this.clientes().length + 1).padStart(3, '0')}`,
        numeroRuc: formData.ruc,
        nombre: formData.nombre,
        tipoCliente: formData.tipoCliente,
        tipoContrato: formData.contrato,
        telefono: formData.telefono,
        email: formData.email,
        ciudad: formData.ciudad,
        pais: formData.pais,
        direccion: formData.direccion,
        limiteCredito: formData.limiteCredito,
        isActive: true
      };

      this.clientes.update(clientes => [...clientes, nuevoCliente]);
      
      this.isLoading.set(false);
      this.successMessage.set('Cliente registrado exitosamente');
      this.registrationForm.reset();
      
      setTimeout(() => this.successMessage.set(''), 3000);
    } else {
      this.registrationForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.registrationForm.reset();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  toggleClienteStatus(cliente: Cliente): void {
    this.clientes.update(clientes => 
      clientes.map(c => 
        c.id === cliente.id ? { ...c, isActive: !c.isActive } : c
      )
    );
  }

  viewCliente(cliente: Cliente): void {
    console.log('View cliente:', cliente);
  }

  editCliente(cliente: Cliente): void {
    console.log('Edit cliente:', cliente);
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
}
