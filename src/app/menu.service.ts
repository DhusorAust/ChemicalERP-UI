import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, of, tap } from 'rxjs';
import { MenuRow, MenuNode } from './menu.types';
import { rowsToTree } from './menu.mapper';
import { environment } from './environments/environment';

 const apiBase = environment.apiBase; 

 const  API = `${apiBase}/api/login/GetMenuLoad`;

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);
  private tree$ = new BehaviorSubject<MenuNode[]>([]);
  private loaded = false;

  load() {
    if (this.loaded) return;
    this.loaded = true;
    debugger;
    this.http.get<MenuRow[]>(API, { withCredentials: true }).pipe(
      catchError(err => { console.error('Menu API error', err); return of<MenuRow[]>([]); }),
      map(rows => rowsToTree(rows)),
      tap(tree => this.tree$.next(tree))
    ).subscribe();
  }

  getMenuTree() { return this.tree$.asObservable(); }
}
