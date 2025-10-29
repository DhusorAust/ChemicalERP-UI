import { MenuNode, MenuRow } from './menu.types';

const clean = (s?: string | null) => (s ?? '').trim();
const isExternal = (p: string) => /^(https?:)?\/\//i.test(p);

// "Setting/Bank" or "/Setting/Bank?x=1" → "/setting/bank"
function normalizePath(p: string) {
  const core = p.split(/[?#]/)[0];                   // strip query/hash
  const withSlash = core.startsWith('/') ? core : '/' + core;
  return withSlash.replace(/\/+$/, '').toLowerCase();
}

function toRoute(r: MenuRow): { route?: string; url?: string } {
  const page = clean(r.PageName);
  if (page) {
    if (isExternal(page)) return { url: page };       // absolute link
    return { route: normalizePath(page) };
  }
  // fallback: /controller/view
  const c = clean(r.Controller), v = clean(r.ViewName);
  if (c && v) return { route: normalizePath(`/${c}/${v}`) };
  return {};
}

export function rowsToTree(rows: MenuRow[]): MenuNode[] {
  const list = (rows ?? [])
    .filter(r => (r.IsActive ?? 1) ? true : false)
    .sort((a,b) => (a.MenuPriority ?? 0) - (b.MenuPriority ?? 0));

  const byId = new Map<number, MenuNode>();
  const roots: MenuNode[] = [];

  for (const r of list) {
    const { route, url } = toRoute(r);
    byId.set(r.MenuID, {
      id: r.MenuID,
      title: clean(r.MenuHead) || clean(r.PageName) || clean(r.ViewName) || `Menu ${r.MenuID}`,
      icon: clean(r.MenuIcon) || undefined,
      route, url,
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
