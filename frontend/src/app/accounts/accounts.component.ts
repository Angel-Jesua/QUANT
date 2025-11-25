import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../dashboard/components/sidebar/sidebar.component';
import { AccountListComponent } from './components/account-list/account-list.component';
import { AccountFormComponent } from './components/account-form/account-form.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, SidebarComponent, AccountListComponent, AccountFormComponent],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountsComponent {}
