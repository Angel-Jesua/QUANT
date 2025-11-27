import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../dashboard/components/sidebar/sidebar.component';
import { JournalService } from '../journal.service';

@Component({
  selector: 'app-journal-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent],
  templateUrl: './journal-list.component.html',
  styleUrls: ['./journal-list.component.scss']
})
export class JournalListComponent implements OnInit {
  journalEntries: any[] = [];
  total = 0;
  loading = false;
  loadError: string | null = null;

  filters = {
    search: '',
    startDate: '',
    endDate: '',
    status: '',
    currency: ''
  };

  constructor(private journalService: JournalService) {}

  ngOnInit() {
    this.loadEntries();
  }

  loadEntries() {
    this.loading = true;
    this.loadError = null;
    
    this.journalService.getJournalEntries(this.filters).subscribe({
      next: (response) => {
        // Handle response format from backend (might be { entries: [], total: 0 } or { data: [], total: 0 })
        this.journalEntries = response?.data || response?.entries || [];
        this.total = response?.total || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading entries', error);
        this.loadError = 'Error al cargar los asientos contables. Por favor, intente de nuevo.';
        this.journalEntries = [];
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.loadEntries();
  }

  getStatus(entry: any): string {
    if (entry?.isReversed) return 'REVERSED';
    if (entry?.isPosted) return 'POSTED';
    return 'DRAFT';
  }

  getStatusClass(entry: any): string {
    if (entry?.isReversed) return 'reversed';
    if (entry?.isPosted) return 'posted';
    return 'draft';
  }

  getStatusLabel(entry: any): string {
    if (entry.isReversed) return 'Reversado';
    if (entry.isPosted) return 'Posteado';
    return 'Borrador';
  }
}
