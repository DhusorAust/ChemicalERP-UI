import { Component, ViewEncapsulation, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, NgIf, NgFor, isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

/*** API row shape (tolerant to naming) ***/
interface MenuRow {
  MenuID: number | string;
  ParentMenuID: number | string | null;
  MenuHead?: string | null;
  MenuTitle?: string | null;
  MenuIcon?: string | null;
  Controller?: string | null;
  ViewName?: string | null;
  PageName?: string | null;
  MenuPriority?: number | string | null;
  IsActive?: number | boolean | null;
  // যদি API আলাদা করে দেয়, নিলে নাও
  Href1?: string | null;
  Href2?: string | null;
  ParameterValue?: string | null;
}

interface MenuNode {
  id: number;
  title: string;
  icon?: string | null;
  /** leaf হলে href থাকবে, folder হলে null */
  href: string | null;
  /** jQuery helper-এর href1, href2 সমর্থন করতে */
  href1?: string | null;
  href2?: string | null;
  children: MenuNode[];
}

@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, NgIf, NgFor, RouterOutlet]
})
export class Home {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  tree = signal<MenuNode[]>([]);
  error = signal('');
  open = signal<Record<string, boolean>>({});
  activeHref = signal<string>('');   // ঠিক যেটা match হয়েছে

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // login না হলে ফিরে যান
    if (sessionStorage.getItem('isAuth') !== '1') {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
    
    const url = `${environment.apiBase}/api/login/GetMenuLoad`; 

    // API থেকে মেনু আনুন
    this.http
    this.http.get<MenuRow[]>(url, { withCredentials: true }).subscribe({
        next: rows => {
          const list = Array.isArray(rows) ? rows : [];
          const tree = rowsToTree_likeMenuHelper(list);
          this.tree.set(tree);

          // jQuery logic অনুযায়ী auto-open + active
          const cur = currentUrlNormalized();
          const { openIds, activeHref } = findActiveAndOpen(cur, tree);
          const map: Record<string, boolean> = {};
          openIds.forEach(id => (map[String(id)] = true));
          this.open.set(map);
          this.activeHref.set(activeHref ?? '');
        },
        error: err => this.error.set(err?.message || 'Menu load failed')
      });
  }

  toggle(id: number) {
    const k = String(id);
    const m = { ...this.open() };
    m[k] = !m[k];
    this.open.set(m);
  }
  isOpen(id: number) {
    return !!this.open()[String(id)];
  }
  isActive(href: string | null) {
    if (!href) return false;
    return normalize(href) === this.activeHref();
  }
}

/* ----------------- helpers (MenuHelper parity) ----------------- */

function toNum(v: any, def = 0): number {
  const x = Number(typeof v === 'string' ? v.trim() : v);
  return Number.isFinite(x) ? x : def;
}
function normalize(s: string) {
  try {
    const u = decodeURIComponent(s);
    return u.replace(/\/$/, '');
  } catch {
    return s.replace(/\/$/, '');
  }
}
function currentUrlNormalized() {
  const cur = window.location.pathname + window.location.search;
  return normalize(cur);
}

/** MenuHelper: leaf href = "/Controller/ViewName?menuId=..&pageName=.." অথবা PageName থাকলে সেটাই */
function buildHref(r: MenuRow): string | null {
  if (r.PageName) {
    const p = r.PageName.startsWith('/') ? r.PageName : '/' + r.PageName;
    return normalize(p);
  }
  if (r.Controller && r.ViewName) {
    const base = `/${r.Controller}/${r.ViewName}`;
    const qsParts: string[] = [];
    qsParts.push(`menuId=${r.MenuID}`);
    if (r.PageName) qsParts.push(`pageName=${encodeURIComponent(r.PageName)}`);
    if (r.ParameterValue) qsParts.push(`p=${encodeURIComponent(r.ParameterValue)}`);
    const href = qsParts.length ? `${base}?${qsParts.join('&')}` : base;
    return normalize(href);
  }
  return null;
}

/** href1/href2: API দিলে সেটা রাখি; না দিলে বেস path derive করি */
function buildHints(r: MenuRow): { h1?: string; h2?: string } {
  if (r.Href1 || r.Href2) return { h1: r.Href1 ?? undefined, h2: r.Href2 ?? undefined };
  if (r.Controller && r.ViewName) {
    const base = normalize(`/${r.Controller}/${r.ViewName}`);
    return { h1: base, h2: base + '?' };
  }
  return {};
}

/** folder হলে href=null (MenuHelper এর 'javascript:;' এর সমান আচরণ) */
function rowsToTree_likeMenuHelper(src: MenuRow[]): MenuNode[] {
  const seen = new Set<string>();
  const rows = src
    .filter(r => (r.IsActive ?? 1) ? true : false)
    .map(r => ({
      ...r,
      MenuID: toNum(r.MenuID),
      ParentMenuID: r.ParentMenuID == null ? 0 : toNum(r.ParentMenuID),
      MenuPriority: r.MenuPriority == null ? 0 : toNum(r.MenuPriority)
    }))
    .filter(r => {
      const key = `${r.MenuID}|${r.ParentMenuID}|${r.Controller ?? ''}|${r.ViewName ?? ''}|${r.PageName ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.MenuPriority! - b.MenuPriority!));

  const byId = new Map<number, MenuNode>();
  for (const r of rows) {
    const href = buildHref(r);
    const hints = buildHints(r);
    byId.set(r.MenuID as number, {
      id: r.MenuID as number,
      title: r.MenuHead || r.MenuTitle || r.ViewName || `Menu ${r.MenuID}`,
      icon: r.MenuIcon || null,
      href,                  // temp; folders later null করা হবে
      href1: hints.h1,
      href2: hints.h2,
      children: []
    });
  }

  const roots: MenuNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.MenuID as number)!;
    const pid = r.ParentMenuID as number;
    if (!pid || !byId.has(pid)) roots.push(node);
    else byId.get(pid)!.children.push(node);
  }

  // folder detection: যার child আছে, তার href=null
  const stack = [...roots];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.children.length) n.href = null;
    n.children.forEach(c => stack.push(c));
  }

  return roots;
}

/** jQuery-এর দুই লুপের সমতুল্য: exact href match অথবা href1/href2 contains */
function findActiveAndOpen(curUrlNorm: string, roots: MenuNode[]) {
  const openIds = new Set<number>();
  let activeHref: string | null = null;

  const walk = (n: MenuNode, chain: number[]): boolean => {
    const isLeaf = !n.children.length && !!n.href;
    const eq = isLeaf && normalize(n.href!) === curUrlNorm;
    const contains1 = n.href1 ? curUrlNorm.indexOf(n.href1) >= 0 : false;
    const contains2 = n.href2 ? curUrlNorm.indexOf(n.href2) >= 0 : false;

    let childHit = false;
    for (const c of n.children) childHit = walk(c, [...chain, n.id]) || childHit;

    const hit = eq || contains1 || contains2 || childHit;
    if (eq && isLeaf) activeHref = normalize(n.href!);
    if (hit) chain.forEach(id => openIds.add(id));
    return hit;
  };

  for (const r of roots) walk(r, []);
  return { openIds, activeHref };
}
