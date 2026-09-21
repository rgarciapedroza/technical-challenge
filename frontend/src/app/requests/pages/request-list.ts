import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, map, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import { RequestCategory, RequestPriority, RequestResponse, RequestStatus } from '../models/request';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../models/request-labels';
import { RequestService } from '../services/request.service';

export type SortOrder = 'A-Z' | 'Z-A' | 'NEWEST' | 'OLDEST';

export interface FilterCriteria {
  search: string;
  category: string;
  priority: string;
  status: string;
  sort: SortOrder;
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function compareRequests(a: RequestResponse, b: RequestResponse, order: SortOrder): number {
  if (order === 'NEWEST') {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return timeDiff !== 0 ? timeDiff : b.id - a.id;
  }
  if (order === 'OLDEST') {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return timeDiff !== 0 ? timeDiff : a.id - b.id;
  }
  const comparison = a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
  if (comparison !== 0) {
    return order === 'A-Z' ? comparison : -comparison;
  }
  return a.id - b.id;
}

export function filterAndSortRequests(
  requests: readonly RequestResponse[],
  criteria: FilterCriteria,
): RequestResponse[] {
  const trimmed = criteria.search.trim();
  const normalizedSearch = normalizeText(trimmed);

  return [...requests]
    .filter((req) => {
      if (criteria.category !== 'ALL' && req.category !== criteria.category) {
        return false;
      }
      if (criteria.priority !== 'ALL' && req.priority !== criteria.priority) {
        return false;
      }
      if (criteria.status !== 'ALL' && req.status !== criteria.status) {
        return false;
      }
      if (normalizedSearch.length > 0) {
        if (!normalizeText(req.title).includes(normalizedSearch)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => compareRequests(a, b, criteria.sort));
}

export interface SummaryIndicators {
  total: number;
  completed: number;
  needsAttention: number;
  inProgress: number;
}

export function calculateSummary(requests: readonly RequestResponse[]): SummaryIndicators {
  let completed = 0;
  let needsAttention = 0;
  let inProgress = 0;

  for (const req of requests) {
    if (req.status === 'DONE') {
      completed++;
    }
    if (req.needsAttention) {
      needsAttention++;
    }
    if (req.status === 'IN_PROGRESS') {
      inProgress++;
    }
  }

  return {
    total: requests.length,
    completed,
    needsAttention,
    inProgress,
  };
}

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'loaded';
      requests: RequestResponse[];
      allRequests: RequestResponse[];
      hasFiltersApplied: boolean;
      summary: SummaryIndicators;
    };

@Component({
  selector: 'app-request-list',
  imports: [AsyncPipe, RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './request-list.html',
  styleUrl: './request-list.css',
})
export class RequestList {
  private readonly service = inject(RequestService);
  private readonly reload = new Subject<void>();

  protected readonly categories = CATEGORY_LABELS;
  protected readonly priorities = PRIORITY_LABELS;
  protected readonly statuses = STATUS_LABELS;

  protected readonly categoryOptions = Object.entries(CATEGORY_LABELS) as [RequestCategory, string][];
  protected readonly priorityOptions = Object.entries(PRIORITY_LABELS) as [RequestPriority, string][];
  protected readonly statusOptions = Object.entries(STATUS_LABELS) as [RequestStatus, string][];

  readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    category: new FormControl('ALL', { nonNullable: true }),
    priority: new FormControl('ALL', { nonNullable: true }),
    status: new FormControl('ALL', { nonNullable: true }),
    sort: new FormControl<SortOrder>('A-Z', { nonNullable: true }),
  });

  private readonly requests$ = this.reload.pipe(
    startWith(undefined),
    switchMap(() =>
      this.service.findAll().pipe(
        map((requests) => ({ status: 'loaded' as const, requests })),
        catchError(() => of({ status: 'error' as const })),
        startWith({ status: 'loading' as const }),
      ),
    ),
  );

  protected readonly state$: Observable<ListState> = combineLatest([
    this.requests$,
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.getRawValue())),
  ]).pipe(
    map(([reqState, criteria]) => {
      if (reqState.status === 'loading') {
        return { status: 'loading' as const };
      }
      if (reqState.status === 'error') {
        return { status: 'error' as const };
      }
      const allRequests = reqState.requests;
      const filtered = filterAndSortRequests(allRequests, {
        search: criteria.search ?? '',
        category: criteria.category ?? 'ALL',
        priority: criteria.priority ?? 'ALL',
        status: criteria.status ?? 'ALL',
        sort: (criteria.sort as SortOrder) ?? 'A-Z',
      });
      const hasFiltersApplied =
        (criteria.search?.trim().length ?? 0) > 0 ||
        criteria.category !== 'ALL' ||
        criteria.priority !== 'ALL' ||
        criteria.status !== 'ALL' ||
        criteria.sort !== 'A-Z';

      const summary = calculateSummary(allRequests);

      return {
        status: 'loaded' as const,
        requests: filtered,
        allRequests,
        hasFiltersApplied,
        summary,
      };
    }),
  );

  protected retry(): void {
    this.reload.next();
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      category: 'ALL',
      priority: 'ALL',
      status: 'ALL',
      sort: 'A-Z',
    });
  }
}
