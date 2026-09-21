import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { RequestDetails } from './request-details';
import { RequestService } from '../services/request.service';
import { RequestResponse } from '../models/request';

describe('RequestDetails', () => {
  let harness: RouterTestingHarness;
  const findById = vi.fn();
  const request: RequestResponse = {
    id: 42, title: 'Repair laptop', description: 'Repair the damaged screen.',
    category: 'HARDWARE', priority: 'HIGH', status: 'OPEN', needsAttention: true,
    createdAt: new Date(2003, 10, 21, 14, 30, 0).toISOString(),
    updatedAt: new Date(2026, 6, 21, 15, 45, 0).toISOString(),
  };

  beforeEach(async () => {
    findById.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'requests/:id', component: RequestDetails }]),
        { provide: RequestService, useValue: { findById } },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  const element = () => harness.routeNativeElement!;
  const render = async () => {
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  it('shows loading while waiting for the response', async () => {
    findById.mockReturnValue(new Subject<RequestResponse>());
    await harness.navigateByUrl('/requests/42', RequestDetails);
    expect(element().textContent).toContain('Loading request...');
    expect(element().querySelector('article')).toBeNull();
  });

  it('renders details, local dates and edit navigation', async () => {
    findById.mockReturnValue(of(request));
    await harness.navigateByUrl('/requests/42', RequestDetails);
    expect(findById).toHaveBeenCalledWith(42);
    expect(element().querySelector('h2')?.textContent).toBe(request.title);
    expect(element().textContent).toContain(request.description);
    expect(element().textContent).toContain('Hardware');
    expect(element().textContent).toContain('High');
    expect(element().textContent).toContain('Open');
    expect(element().textContent).toContain('Needs attention');
    expect(element().querySelector('a[href="/requests/42/edit"]')).not.toBeNull();
    expect(element().querySelector('a[href="/requests"]')).not.toBeNull();
    const dates = element().querySelectorAll('time');
    expect(dates[0].textContent).toBe('21-11-2003 14:30:00');
    expect(dates[1].textContent).toBe('21-07-2026 15:45:00');
  });

  it('shows REJECTED without an attention indicator', async () => {
    findById.mockReturnValue(of({ ...request, status: 'REJECTED', needsAttention: false }));
    await harness.navigateByUrl('/requests/42', RequestDetails);
    expect(element().textContent).toContain('Rejected');
    expect(element().querySelector('.attention')).toBeNull();
  });

  it.each(['abc', '0', '-1', '1.5', '1e2', '9007199254740992', '9223372036854775807'])(
    'rejects invalid or unsafe ID %s without an API request', async (id) => {
      await harness.navigateByUrl('/requests/' + id, RequestDetails);
      expect(element().textContent).toContain('Invalid request ID.');
      expect(findById).not.toHaveBeenCalled();
      expect(element().querySelector('article')).toBeNull();
    },
  );

  it('renders not-found separately from other errors', async () => {
    findById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await harness.navigateByUrl('/requests/42', RequestDetails);
    expect(element().querySelector('[role="alert"]')?.textContent).toBe('Request not found.');
    expect(element().querySelector('a[href$="/edit"]')).toBeNull();
  });

  it('retries after an HTTP error without exposing technical details', async () => {
    findById.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 500, error: 'Private database details',
    })));
    await harness.navigateByUrl('/requests/42', RequestDetails);
    expect(element().textContent).toContain('Unable to load request.');
    expect(element().textContent).not.toContain('Private database details');
    const retry = new Subject<RequestResponse>();
    findById.mockReturnValue(retry);
    element().querySelector('button')!.click();
    await render();
    expect(element().textContent).toContain('Loading request...');
    retry.next(request);
    await render();
    expect(element().querySelector('h2')?.textContent).toBe(request.title);
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it('recovers on a new route after not-found and invalid IDs', async () => {
    findById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const component = await harness.navigateByUrl('/requests/42', RequestDetails);
    expect(await harness.navigateByUrl('/requests/invalid', RequestDetails)).toBe(component);
    expect(element().textContent).toContain('Invalid request ID.');
    findById.mockReturnValue(of({ ...request, id: 43, title: 'New request' }));
    expect(await harness.navigateByUrl('/requests/43', RequestDetails)).toBe(component);
    expect(element().querySelector('h2')?.textContent).toBe('New request');
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it('cancels an obsolete read and prevents a stale response from replacing current data', async () => {
    const oldRead = new Subject<RequestResponse>();
    const newRead = new Subject<RequestResponse>();
    const cancelled = vi.fn();
    findById.mockImplementation((id: number) => id === 42
      ? new Observable<RequestResponse>((subscriber) => {
          const subscription = oldRead.subscribe(subscriber);
          return () => { subscription.unsubscribe(); cancelled(); };
        })
      : newRead);
    const component = await harness.navigateByUrl('/requests/42', RequestDetails);
    expect(await harness.navigateByUrl('/requests/43', RequestDetails)).toBe(component);
    expect(cancelled).toHaveBeenCalledTimes(1);
    newRead.next({ ...request, id: 43, title: 'Current request' });
    await render();
    oldRead.next(request);
    await render();
    expect(element().querySelector('h2')?.textContent).toBe('Current request');
    expect(element().querySelector('a[href="/requests/43/edit"]')).not.toBeNull();
  });

  it('removes previously loaded details while loading a different request', async () => {
    findById.mockReturnValueOnce(of(request)).mockReturnValue(new Subject<RequestResponse>());
    await harness.navigateByUrl('/requests/42', RequestDetails);
    await harness.navigateByUrl('/requests/43', RequestDetails);
    expect(element().querySelector('article')).toBeNull();
    expect(element().textContent).toContain('Loading request...');
  });

  it('unsubscribes from the read when the view is destroyed', async () => {
    const cancelled = vi.fn();
    findById.mockReturnValue(new Observable<RequestResponse>(() => cancelled));
    await harness.navigateByUrl('/requests/42', RequestDetails);
    harness.fixture.destroy();
    expect(cancelled).toHaveBeenCalledTimes(1);
  });
});
