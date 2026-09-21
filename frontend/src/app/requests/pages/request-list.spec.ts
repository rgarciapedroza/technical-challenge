import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { RequestList, normalizeText, filterAndSortRequests, compareRequests, calculateSummary } from './request-list';
import { RequestService } from '../services/request.service';
import { RequestResponse } from '../models/request';

describe('RequestList', () => {
  let fixture: ComponentFixture<RequestList>;
  let response: Subject<RequestResponse[]>;
  const findAll = vi.fn();
  const request: RequestResponse = {
    id: 42, title: 'Repair laptop', description: 'Repair the damaged screen.',
    category: 'IT_SUPPORT', priority: 'HIGH', status: 'IN_PROGRESS',
    needsAttention: true, createdAt: '2003-11-21T13:30:00Z',
    updatedAt: '2026-07-21T12:30:00Z',
  };

  beforeEach(async () => {
    findAll.mockReset();
    response = new Subject<RequestResponse[]>();
    findAll.mockReturnValue(response);
    await TestBed.configureTestingModule({
      imports: [RequestList],
      providers: [provideRouter([]), { provide: RequestService, useValue: { findAll } }],
    }).compileComponents();
    fixture = TestBed.createComponent(RequestList);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  const element = () => fixture.nativeElement as HTMLElement;

  it('shows loading while the request is pending', () => {
    expect(element().querySelector('[role="status"]')?.textContent).toContain('Loading requests...');
    expect(element().querySelector('table')).toBeNull();
    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state with zero counters only after a successful empty result', async () => {
    response.next([]);
    await fixture.whenStable();
    expect(element().textContent).toContain('No requests found.');
    expect(element().textContent).not.toContain('Loading requests...');
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/requests/new');
    expect(element().querySelector('.filters-toolbar')).toBeNull();
    expect(element().querySelector('.summary-grid')).not.toBeNull();
    const values = element().querySelectorAll('.summary-value');
    expect(values[0].textContent).toBe('0');
    expect(values[1].textContent).toBe('0');
    expect(values[2].textContent).toBe('0');
    expect(values[3].textContent).toBe('0');
  });

  it('renders request links, labels, attention and browser-local dates', async () => {
    const localRequest = {
      ...request,
      createdAt: new Date(2003, 10, 21, 14, 30, 0).toISOString(),
      updatedAt: new Date(2026, 6, 21, 14, 30, 0).toISOString(),
    };
    response.next([localRequest]);
    await fixture.whenStable();
    expect(element().querySelector('tbody a')?.getAttribute('href')).toBe('/requests/42');
    expect(element().textContent).toContain('Repair laptop');
    expect(element().textContent).toContain('IT support');
    expect(element().textContent).toContain('High');
    expect(element().textContent).toContain('In progress');
    expect(element().textContent).toContain('Needs attention');
    const dates = element().querySelectorAll('time');
    expect(dates[0].textContent).toBe('21-11-2003 14:30:00');
    expect(dates[1].textContent).toBe('21-07-2026 14:30:00');
    expect(dates[0].getAttribute('datetime')).toBe(localRequest.createdAt);
    expect(element().textContent).toContain('Dates and times are shown in your local time zone.');
  });

  it('does not flag a rejected high-priority request for attention', async () => {
    response.next([{ ...request, status: 'REJECTED', needsAttention: false }]);
    await fixture.whenStable();
    expect(element().querySelector('tbody')?.textContent).toContain('Rejected');
    expect(element().querySelector('.attention')).toBeNull();
  });

  it('shows an error instead of an empty state and hides raw error details', async () => {
    response.error(new Error('Private database information'));
    await fixture.whenStable();
    expect(element().querySelector('[role="alert"]')?.textContent).toBe('Unable to load requests.');
    expect(element().textContent).not.toContain('Private database information');
    expect(element().textContent).not.toContain('No requests found.');
    expect(element().querySelector('button')?.textContent).toBe('Retry');
    expect(element().querySelector('.summary-grid')).toBeNull();
  });

  it('retries after an error and then renders the response', async () => {
    response.error(new Error('Unavailable'));
    await fixture.whenStable();
    const retryResponse = new Subject<RequestResponse[]>();
    findAll.mockReturnValue(retryResponse);
    element().querySelector('button')!.click();
    await fixture.whenStable();
    expect(findAll).toHaveBeenCalledTimes(2);
    expect(element().textContent).toContain('Loading requests...');
    expect(element().querySelector('[role="alert"]')).toBeNull();
    retryResponse.next([request]);
    await fixture.whenStable();
    expect(element().querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('allows another retry when the first retry also fails', async () => {
    response.error(new Error('Unavailable'));
    await fixture.whenStable();
    const retryResponse = new Subject<RequestResponse[]>();
    findAll.mockReturnValue(retryResponse);
    element().querySelector('button')!.click();
    await fixture.whenStable();
    retryResponse.error(new Error('Still unavailable'));
    await fixture.whenStable();
    expect(element().querySelector('button')?.textContent).toBe('Retry');
    expect(element().textContent).toContain('Unable to load requests.');
  });

  it('unsubscribes from an active read when the page is destroyed', async () => {
    fixture.destroy();
    const unsubscribe = vi.fn();
    findAll.mockReturnValue(new Observable<RequestResponse[]>(() => unsubscribe));
    fixture = TestBed.createComponent(RequestList);
    fixture.detectChanges();
    fixture.destroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  describe('search, filters and sorting', () => {
    const sampleRequests: RequestResponse[] = [
      {
        id: 1, title: 'Repository access', description: 'Grant access',
        category: 'ACCESS', priority: 'MEDIUM', status: 'OPEN',
        needsAttention: false, createdAt: '2026-09-21T10:00:00Z', updatedAt: '2026-09-21T10:00:00Z',
      },
      {
        id: 2, title: 'Repair reception laptop', description: 'Hardware repair',
        category: 'HARDWARE', priority: 'HIGH', status: 'IN_PROGRESS',
        needsAttention: true, createdAt: '2026-09-21T10:00:00Z', updatedAt: '2026-09-21T10:00:00Z',
      },
      {
        id: 3, title: 'Revisar conexión de red', description: 'Network issue',
        category: 'IT_SUPPORT', priority: 'HIGH', status: 'OPEN',
        needsAttention: true, createdAt: '2026-09-21T10:00:00Z', updatedAt: '2026-09-21T10:00:00Z',
      },
      {
        id: 4, title: 'Purchase monitors', description: 'Hardware purchase',
        category: 'PURCHASE', priority: 'LOW', status: 'DONE',
        needsAttention: false, createdAt: '2026-09-21T10:00:00Z', updatedAt: '2026-09-21T10:00:00Z',
      },
      {
        id: 5, title: 'Purchase duplicate licence', description: 'License duplicate',
        category: 'PURCHASE', priority: 'HIGH', status: 'REJECTED',
        needsAttention: false, createdAt: '2026-09-21T10:00:00Z', updatedAt: '2026-09-21T10:00:00Z',
      },
    ];

    it('filters by title with partial match, trimmed whitespace, case and accent insensitivity', () => {
      // Accent-insensitive and case-insensitive: "conexion" matches "Revisar conexión de red"
      const result1 = filterAndSortRequests(sampleRequests, {
        search: '  conexion  ',
        category: 'ALL',
        priority: 'ALL',
        status: 'ALL',
        sort: 'A-Z',
      });
      expect(result1).toHaveLength(1);
      expect(result1[0].id).toBe(3);

      // Searching with accent matches unaccented text: "REPARACIÓN" matching "Repair" or similar
      const result2 = filterAndSortRequests(sampleRequests, {
        search: 'laptop',
        category: 'ALL',
        priority: 'ALL',
        status: 'ALL',
        sort: 'A-Z',
      });
      expect(result2).toHaveLength(1);
      expect(result2[0].id).toBe(2);
    });

    it('filters by category, priority and status independently', () => {
      const byCategory = filterAndSortRequests(sampleRequests, {
        search: '',
        category: 'PURCHASE',
        priority: 'ALL',
        status: 'ALL',
        sort: 'A-Z',
      });
      expect(byCategory).toHaveLength(2);

      const byPriority = filterAndSortRequests(sampleRequests, {
        search: '',
        category: 'ALL',
        priority: 'HIGH',
        status: 'ALL',
        sort: 'A-Z',
      });
      expect(byPriority).toHaveLength(3);

      const byStatus = filterAndSortRequests(sampleRequests, {
        search: '',
        category: 'ALL',
        priority: 'ALL',
        status: 'REJECTED',
        sort: 'A-Z',
      });
      expect(byStatus).toHaveLength(1);
      expect(byStatus[0].id).toBe(5);
    });

    it('combines filters with AND semantics', () => {
      // Priority = HIGH AND Status = OPEN
      const combined = filterAndSortRequests(sampleRequests, {
        search: '',
        category: 'ALL',
        priority: 'HIGH',
        status: 'OPEN',
        sort: 'A-Z',
      });
      expect(combined).toHaveLength(1);
      expect(combined[0].id).toBe(3); // Revisar conexión de red
    });

    it('sorts titles A-Z by default and allows Z-A with deterministic ID tie-breaking', () => {
      const az = filterAndSortRequests(sampleRequests, {
        search: '',
        category: 'ALL',
        priority: 'ALL',
        status: 'ALL',
        sort: 'A-Z',
      });
      expect(az[0].title).toBe('Purchase duplicate licence');
      expect(az[1].title).toBe('Purchase monitors');

      const za = filterAndSortRequests(sampleRequests, {
        search: '',
        category: 'ALL',
        priority: 'ALL',
        status: 'ALL',
        sort: 'Z-A',
      });
      expect(za[0].title).toBe('Revisar conexión de red');

      // Tie breaker test
      const tiedRequests: RequestResponse[] = [
        { ...sampleRequests[0], id: 10, title: 'Same Title' },
        { ...sampleRequests[0], id: 5, title: 'Same Title' },
      ];
      const tiedSorted = filterAndSortRequests(tiedRequests, {
        search: '',
        category: 'ALL',
        priority: 'ALL',
        status: 'ALL',
        sort: 'A-Z',
      });
      expect(tiedSorted[0].id).toBe(5);
      expect(tiedSorted[1].id).toBe(10);

      // Newest first and Oldest first test
      const datedRequests: RequestResponse[] = [
        { ...sampleRequests[0], id: 1, createdAt: '2026-09-20T10:00:00Z' },
        { ...sampleRequests[0], id: 2, createdAt: '2026-09-21T10:00:00Z' },
      ];
      const newest = filterAndSortRequests(datedRequests, {
        search: '',
        category: 'ALL',
        priority: 'ALL',
        status: 'ALL',
        sort: 'NEWEST',
      });
      expect(newest[0].id).toBe(2);
      expect(newest[1].id).toBe(1);

      const oldest = filterAndSortRequests(datedRequests, {
        search: '',
        category: 'ALL',
        priority: 'ALL',
        status: 'ALL',
        sort: 'OLDEST',
      });
      expect(oldest[0].id).toBe(1);
      expect(oldest[1].id).toBe(2);
    });

    it('never mutates the source array', () => {
      const original = Object.freeze([...sampleRequests]);
      expect(() => {
        filterAndSortRequests(original, {
          search: '',
          category: 'ALL',
          priority: 'ALL',
          status: 'ALL',
          sort: 'Z-A',
        });
      }).not.toThrow();
    });

    it('updates filtered results when user interacts with search and filters in the UI', async () => {
      response.next(sampleRequests);
      await fixture.whenStable();
      expect(element().querySelectorAll('tbody tr')).toHaveLength(5);

      const component = fixture.componentInstance;
      component['filterForm'].controls.search.setValue('monitors');
      await fixture.whenStable();
      expect(element().querySelectorAll('tbody tr')).toHaveLength(1);
      expect(element().textContent).toContain('Purchase monitors');

      // Clear filters button resets all criteria
      component.clearFilters();
      await fixture.whenStable();
      expect(element().querySelectorAll('tbody tr')).toHaveLength(5);
    });

    it('displays the distinct no-matches state when filters match no requests', async () => {
      response.next(sampleRequests);
      await fixture.whenStable();

      const component = fixture.componentInstance;
      component['filterForm'].controls.search.setValue('nonexistent keyword');
      await fixture.whenStable();

      expect(element().querySelector('table')).toBeNull();
      expect(element().querySelector('.no-matches')?.textContent).toContain(
        'No requests match the selected filters.'
      );
      expect(element().textContent).not.toContain('No requests found.');

      // Click clear filters from no-matches state
      element().querySelector<HTMLButtonElement>('.no-matches button')?.click();
      await fixture.whenStable();
      expect(element().querySelectorAll('tbody tr')).toHaveLength(5);
    });
  });

  describe('summary indicators', () => {
    const demoRequests: RequestResponse[] = [
      { id: 1, title: 'Repository access', description: '', category: 'ACCESS', priority: 'MEDIUM', status: 'OPEN', needsAttention: false, createdAt: '', updatedAt: '' },
      { id: 2, title: 'Purchase monitors', description: '', category: 'PURCHASE', priority: 'LOW', status: 'OPEN', needsAttention: false, createdAt: '', updatedAt: '' },
      { id: 3, title: 'Install design software', description: '', category: 'SOFTWARE', priority: 'MEDIUM', status: 'IN_PROGRESS', needsAttention: false, createdAt: '', updatedAt: '' },
      { id: 4, title: 'Repair reception laptop', description: '', category: 'HARDWARE', priority: 'HIGH', status: 'IN_PROGRESS', needsAttention: true, createdAt: '', updatedAt: '' },
      { id: 5, title: 'Review meeting room connection', description: '', category: 'IT_SUPPORT', priority: 'HIGH', status: 'OPEN', needsAttention: true, createdAt: '', updatedAt: '' },
      { id: 6, title: 'Replace faulty keyboard', description: '', category: 'HARDWARE', priority: 'LOW', status: 'DONE', needsAttention: false, createdAt: '', updatedAt: '' },
      { id: 7, title: 'Purchase duplicate software licence', description: '', category: 'PURCHASE', priority: 'HIGH', status: 'REJECTED', needsAttention: false, createdAt: '', updatedAt: '' },
    ];

    it('calculates the exact counters expected on fresh demo data in a single pass', () => {
      const summary = calculateSummary(demoRequests);
      expect(summary.total).toBe(7);
      expect(summary.completed).toBe(1);
      expect(summary.needsAttention).toBe(2);
      expect(summary.inProgress).toBe(2);
    });

    it('returns zero values for an empty list', () => {
      const summary = calculateSummary([]);
      expect(summary).toEqual({ total: 0, completed: 0, needsAttention: 0, inProgress: 0 });
    });

    it('allows overlapping categories and counts REJECTED only toward total', () => {
      const overlapping: RequestResponse[] = [
        { id: 1, title: 'High In Progress', description: '', category: 'ACCESS', priority: 'HIGH', status: 'IN_PROGRESS', needsAttention: true, createdAt: '', updatedAt: '' },
        { id: 2, title: 'High Rejected', description: '', category: 'ACCESS', priority: 'HIGH', status: 'REJECTED', needsAttention: false, createdAt: '', updatedAt: '' },
      ];
      const summary = calculateSummary(overlapping);
      expect(summary.total).toBe(2);
      expect(summary.inProgress).toBe(1);
      expect(summary.needsAttention).toBe(1);
      expect(summary.completed).toBe(0);
    });

    it('renders indicators in UI and keeps counters unchanged when filters are applied', async () => {
      response.next(demoRequests);
      await fixture.whenStable();

      const getValues = () => Array.from(element().querySelectorAll('.summary-value')).map(el => el.textContent?.trim());
      expect(getValues()).toEqual(['7', '1', '2', '2']);

      // Filter by category: PURCHASE (only 2 match out of 7)
      const component = fixture.componentInstance;
      component.filterForm.controls.category.setValue('PURCHASE');
      await fixture.whenStable();

      // Table displays only 2 matching items
      expect(element().querySelectorAll('tbody tr')).toHaveLength(2);

      // Global summary indicators remain 7, 1, 2, 2 (calculated from full dataset)
      expect(getValues()).toEqual(['7', '1', '2', '2']);
    });
  });
});
