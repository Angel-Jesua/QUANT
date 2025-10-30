import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { fadeInUp, fadeInDown, fadeInOut } from '../../animations';

@Component({
  selector: 'app-password-recovery',
  templateUrl: './password-recovery.component.html',
  styleUrl: './password-recovery.component.css',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  animations: [fadeInUp, fadeInDown, fadeInOut]
})
export class PasswordRecoveryComponent implements OnInit {
  recoveryForm: FormGroup;
  isSubmitted = false;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.recoveryForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  get email(): AbstractControl | null {
    return this.recoveryForm.get('email');
  }

  onSubmit(): void {
    if (this.recoveryForm.invalid) {
      return;
    }

    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      this.isSubmitted = true;
    }, 1500);
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}