import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuNode } from '../../../menu.types'; // ← 3 levels up to app/menu.types

type Expander = { value: Set<number>; set: (s: Set<number>) => void; };

@Component({
  standalone: true,
  selector: 'app-sidebar-node',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  styles: [`
    li.menu-item{list-style:none}
    .menu-link{display:flex;align-items:center;gap:.6rem;padding:.55rem .9rem;border-radius:.5rem;color:#dbe7ff;text-decoration:none}
    .menu-link:hover{background:#173247}
    .menu-link-active{background:#1f5b6b}
    .menu-text{flex:1}
    .menu-arrow{transition:transform .15s ease}
    .open > .menu-link .menu-arrow{transform:rotate(90deg)}
    .menu-submenu{margin-left:.5rem;border-left:1px solid #2a3f4e}
    .menu-subnav{padding-left:.25rem;margin:.25rem 0}
    .menu-icon i{width:1.25rem;text-align:center}
  `],
  template: `
  <li class="menu-item" [class.menu-item-submenu]="node.children?.length" [class.open]="isOpen">
    <a class="menu-link"
       [routerLink]="node.route || null"
       [attr.href]="node.route ? null : (node.url || null)"
       routerLinkActive="menu-link-active"
       (click)="toggleIfFolder($event)">
      <span class="menu-icon" *ngIf="node.icon"><i [class]="node.icon"></i></span>
      <span class="menu-text">{{node.title}}</span>
      <i class="menu-arrow" *ngIf="node.children?.length">›</i>
    </a>

    <div class="menu-submenu" *ngIf="node.children?.length" [style.display]="isOpen ? 'block' : 'none'">
      <ul class="menu-subnav">
        <app-sidebar-node *ngFor="let c of node.children"
                          [node]="c"
                          [expandedIds]="expandedIds"></app-sidebar-node>
      </ul>
    </div>
  </li>
  `
})
export class SidebarNodeComponent {
  @Input({ required: true }) node!: MenuNode;
  @Input({ required: true }) expandedIds!: Expander;

  get isOpen() { return this.expandedIds.value.has(Number(this.node.id)); }

  toggleIfFolder(ev: MouseEvent) {
    const isFolder = !!this.node.children?.length && !this.node.route && !this.node.url;
    if (isFolder) {
      ev.preventDefault();
      const set = new Set(this.expandedIds.value);
      const id = Number(this.node.id);
      set.has(id) ? set.delete(id) : set.add(id);
      this.expandedIds.set(set);
    }
  }
}
