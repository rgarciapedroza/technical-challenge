import { RequestCategory, RequestPriority, RequestStatus } from './request';

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  IT_SUPPORT: 'IT support', HARDWARE: 'Hardware', SOFTWARE: 'Software',
  ACCESS: 'Access', PURCHASE: 'Purchase', FACILITIES: 'Facilities',
  HR: 'HR', FINANCE: 'Finance', OTHER: 'Other',
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In progress', DONE: 'Done', REJECTED: 'Rejected',
};
