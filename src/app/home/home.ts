import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// types matching your API rows
interface MenuRow {
  MenuID: number;
  ParentMenuID: number | null;
  MenuTitle: string;
  Controller?: string | null;
  ViewName?: string | null;
  MenuIcon?: string | null;
  MenuPriority: number;
  IsPermission: number; // 1/0
  ParameterValue?: string | null;
}

// tree node for UI
interface MenuNode {
  id: number | string;
  title: string;
  icon?: string | null;
  route?: string | null;
  children?: MenuNode[];
}

@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, NgIf, NgFor, RouterLink, RouterLinkActive, RouterOutlet]
})
export class Home {
  private http = inject(HttpClient);

  // ✅ see both the raw API and the built tree
  raw = signal<MenuRow[] | null>(null);
  tree = signal<MenuNode[]>([]);
  error = signal<string>('');
  open = signal<Record<string, boolean>>({});

  ngOnInit() {
    // 1) fetch your flat list
    this.http.get<MenuRow[]>('http://localhost:56172/api/login/GetMenuLoad', { withCredentials: true })
      .subscribe({
        next: rows => {
          this.raw.set(rows ?? []);
          this.tree.set(rowsToTree(rows ?? []));  // build a tree locally
        },
        error: err => this.error.set(err?.message || 'Menu load failed')
      });
  }

  toggle(id: string | number) {
    const k = String(id);
    const now = { ...this.open() };
    now[k] = !now[k];
    this.open.set(now);
  }
  isOpen(id: string | number) { return !!this.open()[String(id)]; }
}

/* ---------------- mapper: flat rows -> tree ------------------ */
function buildRoute(r: MenuRow): string | null {
  if (!r.Controller || !r.ViewName) return null; // folders have no route
  return r.ParameterValue
    ? `/${r.Controller}/${r.ViewName}?p=${encodeURIComponent(r.ParameterValue)}`
    : `/${r.Controller}/${r.ViewName}`;
}

function rowsToTree(rows: MenuRow[]): MenuNode[] {
  // ⚠️ Be tolerant so we don't lose items while debugging
  const filtered = rows
    //.filter(r => r.IsPermission === 1)  // <-- enable later if needed
    .slice()
    .sort((a, b) => (a.MenuPriority ?? 0) - (b.MenuPriority ?? 0));

  const map = new Map<number, MenuNode>();
  filtered.forEach(r => {
    map.set(r.MenuID, {
      id: r.MenuID,
      title: r.MenuTitle || `Menu ${r.MenuID}`,
      icon: r.MenuIcon || undefined,
      route: buildRoute(r),
      children: []
    });
  });

  const roots: MenuNode[] = [];
  filtered.forEach(r => {
    const node = map.get(r.MenuID)!;
    const pid = r.ParentMenuID ?? 0;
    if (!pid || !map.has(pid)) {
      roots.push(node);
    } else {
      map.get(pid)!.children!.push(node);
    }
  });

  return roots;
}
