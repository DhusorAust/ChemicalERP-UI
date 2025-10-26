// src/app/auth-guard.ts
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

function browserHasAuth(): boolean {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return false;   // SSR: no sessionStorage
  try { return sessionStorage.getItem('isAuth') === '1'; }
  catch { return false; }
}

/** Decides "/" dynamically */
export const startGuard: CanActivateFn = () => {
  const router = inject(Router);
  return browserHasAuth()
    ? router.createUrlTree(['/home'])
    : router.createUrlTree(['/login']);
};

/** Protect /home (and other private routes) */
export const authGuard: CanActivateFn = (_r, state) => {
  const router = inject(Router);
  return browserHasAuth()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keep logged-in users out of /login */
export const loginGuard: CanActivateFn = () => {
  const router = inject(Router);
  return browserHasAuth() ? router.createUrlTree(['/home']) : true;
};
