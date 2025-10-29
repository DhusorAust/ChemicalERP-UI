export interface MenuRow {
  MenuID: number;
  ParentMenuID?: number | null;
  MenuHead?: string | null;
  MenuIcon?: string | null;
  Controller?: string | null;
  ViewName?: string | null;
  PageName?: string | null;      // preferred Angular route (e.g., 'setting/bank' or '/setting/bank' or full URL)
  MenuPriority?: number | null;
  IsActive?: boolean | number | null;
}

export interface MenuNode {
  id: number;
  title: string;
  icon?: string;
  route?: string;                // internal Angular route
  url?: string;                  // external/legacy absolute URL
  order?: number;
  children?: MenuNode[];
}
