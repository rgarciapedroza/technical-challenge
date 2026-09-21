import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { RequestForm } from './request-form';
import { RequestService } from '../services/request.service';
import { RequestResponse } from '../models/request';

describe('RequestForm', () => {
  let harness: RouterTestingHarness;
  const service = { findById: vi.fn(), create: vi.fn(), update: vi.fn() };
  const request: RequestResponse = {
    id: 42, title: 'Repair laptop', description: 'Repair the screen.',
    category: 'HARDWARE', priority: 'HIGH', status: 'REJECTED', needsAttention: false,
    createdAt: '2026-09-21T10:00:00Z', updatedAt: '2026-09-21T10:00:00Z',
  };

  beforeEach(async () => {
    Object.values(service).forEach(mock => mock.mockReset());
    service.findById.mockReturnValue(of(request));
    TestBed.configureTestingModule({ providers: [
      provideRouter([
        { path: 'requests/new', component: RequestForm, data: { mode: 'create' } },
        { path: 'requests/:id/edit', component: RequestForm, data: { mode: 'edit' } },
      ]),
      { provide: RequestService, useValue: service },
    ] });
    harness = await RouterTestingHarness.create();
  });

  const element = () => harness.routeNativeElement!;
  const render = async () => { await harness.fixture.whenStable(); harness.detectChanges(); };
  function setField(id: string, value: string) {
    const field = element().querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('#' + id)!;
    field.value = value;
    field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    field.dispatchEvent(new Event('blur'));
  }
  async function submit() {
    element().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await render();
  }
  function fillValid() {
    setField('title', 'New laptop');
    setField('description', 'Replace the damaged laptop.');
    setField('category', 'HARDWARE');
    setField('priority', 'HIGH');
  }

  it('requires the four creation fields and hides status', async () => {
    await harness.navigateByUrl('/requests/new', RequestForm);
    expect(element().querySelector('#status')).toBeNull();
    await submit();
    for (const label of ['Title', 'Description', 'Category', 'Priority']) {
      expect(element().textContent).toContain(label + ' is required.');
    }
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only title and description', async () => {
    await harness.navigateByUrl('/requests/new', RequestForm);
    fillValid();
    setField('title', '   ');
    setField('description', '\t\n');
    await submit();
    expect(element().textContent).toContain('Title is required.');
    expect(element().textContent).toContain('Description is required.');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects values exceeding maximum lengths', async () => {
    await harness.navigateByUrl('/requests/new', RequestForm);
    fillValid();
    setField('title', 'a'.repeat(121));
    setField('description', 'b'.repeat(2001));
    await submit();
    expect(element().textContent).toContain('Title must not exceed 120 characters.');
    expect(element().textContent).toContain('Description must not exceed 2000 characters.');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('accepts exact maximum lengths and creates without status', async () => {
    await harness.navigateByUrl('/requests/new', RequestForm);
    service.create.mockReturnValue(new Subject<RequestResponse>());
    fillValid();
    setField('title', 'a'.repeat(120));
    setField('description', 'b'.repeat(2000));
    await submit();
    expect(service.create).toHaveBeenCalledWith({
      title: 'a'.repeat(120), description: 'b'.repeat(2000), category: 'HARDWARE', priority: 'HIGH',
    });
    expect(element().querySelector('fieldset')?.disabled).toBe(true);
    await submit();
    expect(service.create).toHaveBeenCalledTimes(1);
  });

  it('navigates to the created request after saving', async () => {
    const saved = new Subject<RequestResponse>();
    service.create.mockReturnValue(saved);
    await harness.navigateByUrl('/requests/new', RequestForm);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fillValid();
    await submit();
    saved.next({ ...request, status: 'OPEN' });
    await render();
    expect(navigate).toHaveBeenCalledWith(['/requests', 42]);
  });

  it('preserves entered values after a save error and allows retry', async () => {
    service.create.mockReturnValue(throwError(() => new Error('Private details')));
    await harness.navigateByUrl('/requests/new', RequestForm);
    fillValid();
    await submit();
    expect(element().textContent).toContain('Unable to save the request.');
    expect(element().textContent).not.toContain('Private details');
    expect(element().querySelector<HTMLInputElement>('#title')?.value).toBe('New laptop');
    expect(element().querySelector<HTMLTextAreaElement>('#description')?.value).toBe('Replace the damaged laptop.');
    expect(element().querySelector<HTMLSelectElement>('#category')?.value).toBe('HARDWARE');
    expect(element().querySelector<HTMLSelectElement>('#priority')?.value).toBe('HIGH');
    expect(element().querySelector('fieldset')?.disabled).toBe(false);
    service.create.mockReturnValue(new Subject<RequestResponse>());
    await submit();
    expect(service.create).toHaveBeenCalledTimes(2);
    expect(element().querySelector('[role="alert"]')).toBeNull();
  });

  it('loads editable values including REJECTED and sends status on update', async () => {
    service.update.mockReturnValue(new Subject<RequestResponse>());
    await harness.navigateByUrl('/requests/42/edit', RequestForm);
    expect(element().querySelector<HTMLInputElement>('#title')?.value).toBe(request.title);
    expect(element().querySelector<HTMLSelectElement>('#status')?.value).toBe('REJECTED');
    setField('status', 'OPEN');
    await submit();
    expect(service.update).toHaveBeenCalledWith(42, {
      title: request.title, description: request.description, category: 'HARDWARE',
      priority: 'HIGH', status: 'OPEN',
    });
    expect(service.create).not.toHaveBeenCalled();
  });

  it('requires status when editing', async () => {
    await harness.navigateByUrl('/requests/42/edit', RequestForm);
    setField('status', '');
    await submit();
    expect(element().textContent).toContain('Status is required.');
    expect(service.update).not.toHaveBeenCalled();
  });

  it('does not expose a form before existing data loads', async () => {
    service.findById.mockReturnValue(new Subject<RequestResponse>());
    await harness.navigateByUrl('/requests/42/edit', RequestForm);
    expect(element().textContent).toContain('Loading request...');
    expect(element().querySelector('form')).toBeNull();
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5', '9007199254740992'])('rejects invalid ID %s', async id => {
    await harness.navigateByUrl('/requests/' + id + '/edit', RequestForm);
    expect(element().textContent).toContain('Invalid request ID.');
    expect(element().querySelector('form')).toBeNull();
    expect(service.findById).not.toHaveBeenCalled();
  });

  it.each([404, 500])('handles load error %s and retries', async status => {
    service.findById.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    await harness.navigateByUrl('/requests/42/edit', RequestForm);
    expect(element().textContent).toContain(status === 404 ? 'Request not found.' : 'Unable to load request.');
    expect(element().querySelector('form')).toBeNull();
    service.findById.mockReturnValue(of(request));
    element().querySelector('button')!.click();
    await render();
    expect(element().querySelector('form')).not.toBeNull();
  });

  it('cancels obsolete reads when the route ID changes', async () => {
    const first = new Subject<RequestResponse>();
    const second = new Subject<RequestResponse>();
    const cancelled = vi.fn();
    service.findById.mockReturnValueOnce(new Observable<RequestResponse>(subscriber => {
      const sub = first.subscribe(subscriber);
      return () => { sub.unsubscribe(); cancelled(); };
    })).mockReturnValue(second);
    const component = await harness.navigateByUrl('/requests/42/edit', RequestForm);
    expect(await harness.navigateByUrl('/requests/43/edit', RequestForm)).toBe(component);
    expect(cancelled).toHaveBeenCalledOnce();
    second.next({ ...request, id: 43, title: 'Current request' });
    first.next(request);
    await render();
    expect(element().querySelector<HTMLInputElement>('#title')?.value).toBe('Current request');
  });

  it('recovers from a failed load on a new route', async () => {
    service.findById.mockReturnValueOnce(throwError(() => new Error('Unavailable'))).mockReturnValue(of(request));
    await harness.navigateByUrl('/requests/41/edit', RequestForm);
    await harness.navigateByUrl('/requests/42/edit', RequestForm);
    expect(element().querySelector<HTMLInputElement>('#title')?.value).toBe(request.title);
  });

  it('ignores an obsolete save result after navigating to another ID', async () => {
    const saved = new Subject<RequestResponse>();
    const cancelled = vi.fn();
    service.update.mockReturnValue(new Observable<RequestResponse>(subscriber => {
      const sub = saved.subscribe(subscriber);
      return () => { sub.unsubscribe(); cancelled(); };
    }));
    await harness.navigateByUrl('/requests/42/edit', RequestForm);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await submit();
    service.findById.mockReturnValue(of({ ...request, id: 43, title: 'Current request' }));
    await harness.navigateByUrl('/requests/43/edit', RequestForm);
    saved.next(request);
    await render();
    expect(cancelled).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(element().querySelector<HTMLInputElement>('#title')?.value).toBe('Current request');
    expect(element().querySelector('fieldset')?.disabled).toBe(false);
  });

  it('cancels a pending save when destroyed', async () => {
    const cancelled = vi.fn();
    service.create.mockReturnValue(new Observable<RequestResponse>(() => cancelled));
    await harness.navigateByUrl('/requests/new', RequestForm);
    fillValid();
    await submit();
    harness.fixture.destroy();
    expect(cancelled).toHaveBeenCalledOnce();
  });
});
