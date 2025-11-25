import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../services/account.service';
import { Account } from '../../models/account.model';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountListComponent implements OnInit {
  private accountService = inject(AccountService);
  accounts = signal<Account[]>([]);

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts() {
    this.accountService.getAccounts().subscribe(data => {
      this.accounts.set(data);
    });
  }

  toggleStatus(account: Account) {
    // Implement toggle logic
    console.log('Toggle status', account);
  }

  viewAccount(account: Account) {
    // Implement view logic
    console.log('View account', account);
  }
}
