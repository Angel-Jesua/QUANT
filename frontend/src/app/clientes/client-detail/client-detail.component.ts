import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService, Client } from '../../services/client.service';
import { SidebarComponent } from '../../dashboard/components/sidebar/sidebar.component';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.scss']
})
export class ClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientService = inject(ClientService);

  client = signal<Client | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadClient(Number(id));
    } else {
      this.error.set('ID de cliente no válido');
      this.isLoading.set(false);
    }
  }

  loadClient(id: number) {
    this.clientService.getClientById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.client.set(response.data);
        } else {
          this.error.set('No se pudo cargar la información del cliente');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading client', err);
        this.error.set('Error al cargar el cliente');
        this.isLoading.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/clientes']);
  }
}
