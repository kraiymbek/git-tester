export interface CbGroup {
  _id?: string; // local db id
  _rev?: string; // local db changes id for doc
  uid?: string;
  scope: string;
  merchant_id: string;
  title: string;
  sort: number;
  media?: any[];
}

export interface CbGroupsAll {
  groups: CbGroup[];
  total_hits: number;
}
