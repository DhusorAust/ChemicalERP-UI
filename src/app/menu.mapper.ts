import { MenuNode, MenuRow } from './menu.types';

function toRoute(r: MenuRow): string | undefined {
  if (r.PageName) return r.PageName.startsWith('/') ? r.PageName : '/' + r.PageName;
  if (r.Controller && r.ViewName)
    return `/${String(r.Controller).toLowerCase()}/${String(r.ViewName).toLowerCase()}`;
  return undefined;
}

export function rowsToTree(rows: MenuRow[]): MenuNode[] {
  const list = (rows ?? [])
    .filter(r => (r.IsActive ?? 1) ? true : false)
    .sort((a, b) => (a.MenuPriority ?? 0) - (b.MenuPriority ?? 0));

  const byId = new Map<number, MenuNode>();
  const roots: MenuNode[] = [];

  for (const r of list) {
    byId.set(r.MenuID, {
      id: r.MenuID,
      title: r.MenuHead || r.PageName || r.ViewName || `Menu ${r.MenuID}`,
      icon: r.MenuIcon || undefined,
      route: toRoute(r),
      order: r.MenuPriority ?? 0,
      children: []
    });
  }

  for (const r of list) {
    const node = byId.get(r.MenuID)!;
    const pid = r.ParentMenuID ?? 0;
    if (pid && byId.has(pid)) byId.get(pid)!.children!.push(node);
    else roots.push(node);
  }

  return roots;
}
