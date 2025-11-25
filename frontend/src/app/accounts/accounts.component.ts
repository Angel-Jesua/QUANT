import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../dashboard/components/sidebar/sidebar.component';
import { AccountListComponent } from './components/account-list/account-list.component';
import { AccountFormComponent } from './components/account-form/account-form.component';
import { AccountImportComponent } from './components/account-import';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    AccountListComponent,
    AccountFormComponent,
    AccountImportComponent,
  ],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountsComponent {
  /** Controls visibility of the import modal */
  showImportModal = signal(false);

  /** Open the import modal */
  openImportModal(): void {
    this.showImportModal.set(true);
  }

  /** Close the import modal */
  closeImportModal(): void {
    this.showImportModal.set(false);
  }

  /** Handle import completion */
  onImportComplete(result: { success: boolean; count: number }): void {
    this.showImportModal.set(false);
    if (result.success && result.count > 0) {
      // Reload accounts list - the AccountListComponent should handle this
      // via a shared service or we can trigger a refresh event
      window.location.reload(); // Simple approach; can be improved with a service
    }
  }
}
