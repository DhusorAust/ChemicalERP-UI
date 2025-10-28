import { Bank } from './setting/bank/bank';
 // src/app/app.routes.ts
import { Routes } from '@angular/router';
import { startGuard, authGuard, loginGuard } from './auth-guard';

export const routes: Routes = [
  { path: '',    canActivate: [startGuard], loadComponent: () => import('./home/home').then(m => m.Home) },
  { path: 'home',  canActivate: [authGuard],  loadComponent: () => import('./home/home').then(m => m.Home) },
  { path: 'login', canActivate: [loginGuard], loadComponent: () => import('./login/login').then(m => m.Login) },
  { path: 'bank',  canActivate: [authGuard],  loadComponent: () => import('./setting/bank/bank').then(m => m.Bank) }, 
 
  { path: '**', redirectTo: '' }
];
