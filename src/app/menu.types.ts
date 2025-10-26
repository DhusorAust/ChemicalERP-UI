// src/app/menu.types.ts
export interface MenuRow {
  MenuID: number;
  ProjectID: number;
  ProjectName: string;
  ProjectModuleID: number;
  ModuleName: string;
  ViewName: string | null;          // can be null/empty for folder items
  Controller: string | null;        // can be null/empty for folder items
  MenuHead: string | null;
  MenuPriority: number;
  ParentMenuID: number;             // 0 (or null) means root
  ParameterValue: string | null;
  SequenceNo: string | null;
  PageName: string | null;
  IsPermission: number;             // 1/0
  MenuTitle: string;
  MenuTitle2: string | null;
  MenuTitle3: string | null;
  MenuTitle4: string | null;
  MenuIcon: string | null;
}

export interface MenuNode {
  id: number | string;
  title: string;
  icon?: string | null;
  route?: string | null;            // null = folder (no navigation)
  children?: MenuNode[];
}
