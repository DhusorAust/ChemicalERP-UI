import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { MenuRow, MenuNode } from './menu.types';
import { rowsToTree } from './menu.mapper';

const API_URL = 'http://localhost:56172/api/login/GetMenuLoad';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private tree$ = new BehaviorSubject<MenuNode[]>([]);

  /** Call once after login (browser only). */
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http.get<MenuRow[]>(API_URL, { withCredentials: true })
      .pipe(
        catchError(err => {
          console.error('Menu API error', err);
          return of<MenuRow[]>([]);
        }),
        map(rows => rowsToTree(rows)),
        tap(tree => this.tree$.next(tree))
      )
      .subscribe();
  }

  /** Subscribe to sidebar tree */
  getMenuTree(): Observable<MenuNode[]> {
    return this.tree$.asObservable();
  }
}
