import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../../dashboard/components/sidebar/sidebar.component';
import { JournalService, JournalEntry } from '../journal.service';
import { ReverseModalComponent, ReverseEntryData } from './reverse-modal/reverse-modal.component';

@Component({
  selector: 'app-journal-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, ReverseModalComponent],
  templateUrl: './journal-detail.component.html',
  styleUrls: ['./journal-detail.component.scss']
})
export class JournalDetailComponent implements OnInit {
  entry: JournalEntry | null = null;
  loading = true;
  error: string | null = null;
  
  // Reverse modal state
  showReverseModal = false;
  reversingEntry = false;
  reverseError: string | null = null;
  reverseSuccess: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private journalService: JournalService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEntry(+id);
    } else {
      this.error = 'ID de asiento no proporcionado';
      this.loading = false;
    }
  }

  loadEntry(id: number) {
    this.loading = true;
    this.journalService.getJournalEntry(id).subscribe({
      next: (entry) => {
        this.entry = entry;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading entry', err);
        this.error = 'Error al cargar el asiento contable';
        this.loading = false;
      }
    });
  }

  get totalDebit(): number {
    if (!this.entry?.lines) return 0;
    return this.entry.lines.reduce((sum, line) => sum + (+line.debitAmount || 0), 0);
  }

  get totalCredit(): number {
    if (!this.entry?.lines) return 0;
    return this.entry.lines.reduce((sum, line) => sum + (+line.creditAmount || 0), 0);
  }

  getStatusClass(): string {
    if (!this.entry) return '';
    if (this.entry.isReversed) return 'reversed';
    if (this.entry.isPosted) return 'posted';
    return 'draft';
  }

  getStatusLabel(): string {
    if (!this.entry) return '';
    if (this.entry.isReversed) return 'Reversado';
    if (this.entry.isPosted) return 'Posteado';
    return 'Borrador';
  }

  // Open the reverse confirmation modal
  openReverseModal() {
    this.reverseError = null;
    this.reverseSuccess = null;
    this.showReverseModal = true;
  }

  // Close the reverse modal
  closeReverseModal() {
    this.showReverseModal = false;
  }

  // Handle the reverse confirmation
  confirmReverse(data: ReverseEntryData) {
    if (!this.entry?.id) return;

    this.reversingEntry = true;
    this.reverseError = null;

    this.journalService.reverseJournalEntry(this.entry.id, data).subscribe({
      next: (reversalEntry) => {
        this.reversingEntry = false;
        this.showReverseModal = false;
        this.reverseSuccess = `Asiento reversado exitosamente. Se creó el asiento de reversión: ${reversalEntry.entryNumber}`;
        
        // Reload the current entry to reflect the reversed status
        if (this.entry?.id) {
          this.loadEntry(this.entry.id);
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.reverseSuccess = null;
        }, 5000);
      },
      error: (err) => {
        this.reversingEntry = false;
        console.error('Error reversing entry', err);
        this.reverseError = err.error?.error || 'Error al reversar el asiento contable';
      }
    });
  }

  // Navigate to the reversal entry
  viewReversalEntry() {
    // The reversal entry would have a reference to this entry
    // For now, navigate back to the list
    this.router.navigate(['/journal']);
  }

  reverseEntry() {
    this.openReverseModal();
  }
}
