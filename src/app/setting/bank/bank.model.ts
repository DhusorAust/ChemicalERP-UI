import { BaseEntity } from './../../common';
import { Int01 } from './../../common';
export interface Bas_Bank {
  BankID: number;
  BankCode: string;
  BankName: string;
  BankShortName: string;
  BankAddress: string;
  SwiftCode: string;
  ADCode: string;

  IsBeneficiaryBank: Int01;
  IsAdvisingBank:Int01;
  IsNegoBank:Int01;
  IsActive: Int01;

  Approved: boolean;
  ApprovedBy: number;
  ApprovedDate: string;

  CreatedBy: number;
  CreatedDate: string;
  UpdatedBy: number;
  UpdatedDate: string;
}

export interface BankSaveDto extends Bas_Bank,BaseEntity {}