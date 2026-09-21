export type RequestCategory =
  | 'IT_SUPPORT' | 'HARDWARE' | 'SOFTWARE' | 'ACCESS' | 'PURCHASE'
  | 'FACILITIES' | 'HR' | 'FINANCE' | 'OTHER';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RequestStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';

export interface CreateRequestRequest {
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
}

export interface UpdateRequestRequest extends CreateRequestRequest {
  status: RequestStatus;
}

export interface RequestResponse extends UpdateRequestRequest {
  id: number;
  needsAttention: boolean;
  createdAt: string;
  updatedAt: string;
}
