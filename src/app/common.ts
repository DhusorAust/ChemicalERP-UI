export type Int01 = 0 | 1;
export type Status = 'EDIT' | 'APPROVED';


export interface BaseEntity {
  SaveOption: number;
  IdentityValue: number;
  ErrNo: number;
  ResultId: number;
  NoofRows: number;
  Message: string;
  ExceptionError: string;
  ErrorNo: number;
  ReturnValue: string;
  UserBy: number;
}

export type ApiSaveResponse = {
  ResultId?: number;     // 1 = success, 0 = fail
  NoofRows?: number;
  ErrorNo?: number;
  Message?: string;
  IdentityValue?: number;
};

  