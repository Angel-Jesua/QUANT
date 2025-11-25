import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./usuarios/usuarios.component').then(m => m.UsuariosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'usuarios/:id',
    loadComponent: () => import('./usuarios/user-detail/user-detail.component').then(m => m.UserDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'cuentas',
    loadComponent: () => import('./accounts/accounts.component').then(m => m.AccountsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'clientes',
    loadComponent: () => import('./clientes/clientes.component').then(m => m.ClientesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'clientes/:id',
    loadComponent: () => import('./clientes/client-detail/client-detail.component').then(m => m.ClientDetailComponent),
    canActivate: [authGuard]
  }
];
