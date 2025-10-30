import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { fadeInUp, fadeInDown, fadeInOut } from '../../animations';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.css',
  animations: [fadeInUp, fadeInDown, fadeInOut]
})
export class PasswordResetComponent implements OnInit {
  resetForm: FormGroup;
  token: string | null = null;
  tokenValid = false;
  isLoading = true;
  isSubmitting = false;
  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';
  showSuccessMessage = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Get token from URL parameters
    this.token = this.route.snapshot.paramMap.get('token');
    
    if (this.token) {
      this.validateToken();
    } else {
      this.isLoading = false;
      this.tokenValid = false;
    }
  }

  // Validate token (simulated - in real app would call backend)
  validateToken(): void {
    // Simulate API call to validate token
    setTimeout(() => {
      // For demo purposes, consider any non-empty token as valid
      this.tokenValid = this.token !== null && this.token.length > 0;
      this.isLoading = false;
      
      if (!this.tokenValid) {
        this.router.navigate(['/auth/login']);
      }
    }, 1000);
  }

  // Password strength checker
  checkPasswordStrength(): void {
    const password = this.resetForm.get('newPassword')?.value || '';
    
    if (!password) {
      this.passwordStrength = 'weak';
      return;
    }
    
    // Check for different criteria
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const isLongEnough = password.length >= 8;
    
    const criteriaMet = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChars, isLongEnough].filter(Boolean).length;
    
    if (criteriaMet <= 2) {
      this.passwordStrength = 'weak';
    } else if (criteriaMet <= 4) {
      this.passwordStrength = 'medium';
    } else {
      this.passwordStrength = 'strong';
    }
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      control.get('confirmPassword')?.setErrors(null);
      return null;
    }
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    
    // Simulate API call to reset password
    setTimeout(() => {
      this.isSubmitting = false;
      this.showSuccessMessage = true;
      
      // Redirect to login after showing success message
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);
    }, 1500);
  }

  getPasswordStrengthClass(): string {
    switch (this.passwordStrength) {
      case 'weak':
        return 'strength-weak';
      case 'medium':
        return 'strength-medium';
      case 'strong':
        return 'strength-strong';
      default:
        return 'strength-weak';
    }
  }

  getPasswordStrengthText(): string {
    switch (this.passwordStrength) {
      case 'weak':
        return 'Débil';
      case 'medium':
        return 'Media';
      case 'strong':
        return 'Fuerte';
      default:
        return 'Débil';
    }
  }
}