import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../services/account.service';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-form.component.html',
  styleUrls: ['./account-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountFormComponent {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);

  accountForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    parentId: [''],
    code: ['', Validators.required],
    type: ['', Validators.required],
    currency: ['', Validators.required],
    isDetail: [false]
  });

  onSubmit() {
    if (this.accountForm.valid) {
      console.log(this.accountForm.value);
      // Call service to create account
    }
  }

  onCancel() {
    this.accountForm.reset();
  }
}
