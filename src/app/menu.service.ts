// src/app/menu.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { MenuRow, MenuNode } from './menu.types';
import { rowsToTree } from './menu.mapper';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);

  // CHANGE to your API path; keep withCredentials if server uses cookies
  private API = 'http://localhost:56172/api/login/GetMenuLoad'; // you’ll return List<Menu> from your code

  getMenuTree() {
    return this.http.get<MenuRow[]>(this.API, { withCredentials: true })
      .pipe(map(rows => rowsToTree(rows)));
  }
}