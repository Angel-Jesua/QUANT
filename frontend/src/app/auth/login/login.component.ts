import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink]
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      usernameOrEmail: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    // Marcar todos los campos como tocados para mostrar errores de validación
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });

    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = {
        email: this.loginForm.value.usernameOrEmail.trim().toLowerCase(),
        password: this.loginForm.value.password,
        rememberMe: this.loginForm.value.rememberMe
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            // Navegar a la página principal después de un inicio de sesión exitoso
            // El token se maneja via cookies HttpOnly
            this.router.navigate(['/dashboard']);
          } else {
            // Manejar respuesta inesperada del servidor
            this.errorMessage = response.message || 'Error inesperado al iniciar sesión';
          }
        },
        error: (error) => {
          this.isLoading = false;
          // El mensaje de error ya está formateado en el servicio
          this.errorMessage = error.message;
          
          // Enfocar el campo de contraseña en caso de error
          const passwordField = document.getElementById('password');
          if (passwordField) {
            setTimeout(() => passwordField.focus(), 100);
          }
        }
      });
    } else {
      // Mostrar mensaje de validación si el formulario no es válido
      if (this.loginForm.get('usernameOrEmail')?.errors?.['required']) {
        this.errorMessage = 'Por favor ingresa tu correo electrónico';
      } else if (this.loginForm.get('password')?.errors?.['required']) {
        this.errorMessage = 'Por favor ingresa tu contraseña';
      }
    }
  }
}
