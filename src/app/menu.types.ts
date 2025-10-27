export interface MenuRow {
  MenuID: number;
  ParentMenuID?: number | null;
  MenuHead?: string | null;
  MenuIcon?: string | null;
  Controller?: string | null;
  ViewName?: string | null;
  PageName?: string | null;      // preferred Angular route (e.g. '/store/requisition')
  MenuPriority?: number | null;
  IsActive?: boolean | number | null;
}

export interface MenuNode {
  id: number;
  title: string;
  icon?: string;
  route?: string;                // internal Angular route (if any)
  url?: string;                  // external/legacy URL (optional)
  order?: number;
  children?: MenuNode[];
}
