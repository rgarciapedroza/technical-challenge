import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { of } from 'rxjs';
import { RequestService } from './requests/services/request.service';
import { RequestList } from './requests/pages/request-list';
import { RequestDetails } from './requests/pages/request-details';
import { RequestForm } from './requests/pages/request-form';

describe('Request routes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideRouter(routes),
    { provide: RequestService, useValue: { findAll: () => of([]) } },
  ] }));

  it('redirects the root to the request list', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', RequestList);
    expect(TestBed.inject(Router).url).toBe('/requests');
  });

  it('resolves new before the dynamic ID route', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/requests/new', RequestForm);
    expect(harness.routeNativeElement?.textContent).toContain('New request');
  });

  it('opens request details', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/requests/42', RequestDetails);
    expect(harness.routeNativeElement?.textContent).toContain('Request details');
  });

  it('opens the edit form', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/requests/42/edit', RequestForm);
    expect(harness.routeNativeElement?.textContent).toContain('Edit request');
  });

  it('redirects unknown routes to the request list', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/unknown/path', RequestList);
    expect(TestBed.inject(Router).url).toBe('/requests');
  });
});
