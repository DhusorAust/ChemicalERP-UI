// src/app/menu.mapper.ts
import { MenuRow, MenuNode } from './menu.types';

function buildRoute(r: MenuRow): string | null {
  // folder (no route) if Controller/ViewName are empty
  if (!r.Controller || !r.ViewName) return null;

  // Choose a scheme. Example: /{Controller}/{ViewName}[?p=ParameterValue]
  return r.ParameterValue
    ? `/${r.Controller}/${r.ViewName}?p=${encodeURIComponent(r.ParameterValue)}`
    : `/${r.Controller}/${r.ViewName}`;
}

export function rowsToTree(rows: MenuRow[]): MenuNode[] {
  // keep only active/allowed rows; sort by MenuPriority
  const filtered = rows
    .filter(r => r.IsPermission === 1)
    .sort((a, b) => a.MenuPriority - b.MenuPriority);

  // create a map of MenuID -> node
  const map = new Map<number, MenuNode>();
  filtered.forEach(r => {
    map.set(r.MenuID, {
      id: r.MenuID,
      title: r.MenuTitle || r.PageName || r.MenuHead || `Menu ${r.MenuID}`,
      icon: r.MenuIcon || undefined,
      route: buildRoute(r),
      children: []
    });
  });

  // attach children to parents
  const roots: MenuNode[] = [];
  filtered.forEach(r => {
    const node = map.get(r.MenuID)!;
    const pid = Number(r.ParentMenuID) || 0;
    if (pid === 0 || !map.has(pid)) {
      roots.push(node);
    } else {
      map.get(pid)!.children!.push(node);
    }
  });

  return roots;
}
