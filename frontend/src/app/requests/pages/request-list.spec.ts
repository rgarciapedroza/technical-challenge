import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { RequestList } from './request-list';
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

  it('shows the empty state only after a successful empty result', async () => {
    response.next([]);
    await fixture.whenStable();
    expect(element().textContent).toContain('No requests found.');
    expect(element().textContent).not.toContain('Loading requests...');
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/requests/new');
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
});
