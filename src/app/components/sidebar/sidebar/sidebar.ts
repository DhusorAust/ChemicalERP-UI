import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MenuNode } from '../../../menu.types';
import { MenuService } from '../../../menu.service';
import { SidebarNodeComponent } from '../sidebar-node/sidebar-node';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, SidebarNodeComponent],
  styles: [`
    .menu-wrapper{width:260px;background:#0e2a33;color:#dbe7ff;min-height:100dvh;padding:10px}
    .menu-brand{display:block;margin:12px 8px 16px;color:#fff;text-decoration:none;font-weight:700;letter-spacing:.08em}
    ul.menu-nav{margin:0;padding:0}
    .menu-section{padding:.5rem .9rem .25rem;opacity:.8;font-size:12px;text-transform:uppercase}
  `],
  template: `
  <aside class="menu-wrapper">
    <a class="menu-brand" routerLink="/home">CHEMICAL ERP</a>
    <ul class="menu-nav">
      <li class="menu-section">Navigation</li>
      <app-sidebar-node *ngFor="let n of nodes" [node]="n" [expandedIds]="expanded"></app-sidebar-node>
    </ul>
  </aside>
  `
})
export class SidebarComponent implements OnInit {
  private menu = inject(MenuService);
  private router = inject(Router);

  nodes: MenuNode[] = [];

  expanded = {
    value: new Set<number>(),
    set: (s: Set<number>) => this.expanded.value = s
  };

  ngOnInit() {
    this.menu.load();
    this.menu.getMenuTree().subscribe(tree => {
      this.nodes = tree;
      this.expandForUrl(this.router.url);
    });

    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.expandForUrl(e.urlAfterRedirects));
  }

  private expandForUrl(url: string) {
    const urlL = (url || '').toLowerCase();
    const set = new Set<number>();
    const walk = (n: MenuNode, chain: number[]): boolean => {
      const r = (n.route ?? '').toLowerCase();
      const selfActive = !!r && (urlL === r || urlL.startsWith(r + '/') || urlL.startsWith(r + '?'));
      let childActive = false;
      for (const c of (n.children ?? [])) childActive = walk(c, [...chain, Number(n.id)]) || childActive;
      if (selfActive || childActive) chain.forEach(id => set.add(id));
      return selfActive || childActive;
    };
    for (const n of (this.nodes ?? [])) walk(n, []);
    this.expanded.set(set);
  }
}
