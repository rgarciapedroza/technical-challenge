import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { RequestService } from './request.service';
import { RequestResponse } from '../models/request';

describe('RequestService', () => {
  let service: RequestService;
  let http: HttpTestingController;
  const response: RequestResponse = {
    id: 42, title: 'Repository access', description: 'Grant repository access.',
    category: 'ACCESS', priority: 'HIGH', status: 'OPEN', needsAttention: true,
    createdAt: '2026-09-21T10:00:00Z', updatedAt: '2026-09-21T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RequestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the request list from the relative API URL', async () => {
    const result = firstValueFrom(service.findAll());
    http.expectOne({ method: 'GET', url: '/api/requests' }).flush([response]);
    expect(await result).toEqual([response]);
  });

  it('preserves a successful empty list', async () => {
    const result = firstValueFrom(service.findAll());
    http.expectOne('/api/requests').flush([]);
    expect(await result).toEqual([]);
  });

  it('loads a request by ID', async () => {
    const result = firstValueFrom(service.findById(42));
    http.expectOne({ method: 'GET', url: '/api/requests/42' }).flush(response);
    expect(await result).toEqual(response);
  });

  it('creates with only allowed fields even when the input has extra properties', async () => {
    const result = firstValueFrom(service.create(response));
    const request = http.expectOne({ method: 'POST', url: '/api/requests' });
    expect(request.request.body).toEqual({
      title: response.title, description: response.description,
      category: response.category, priority: response.priority,
    });
    expect(request.request.body).not.toHaveProperty('status');
    request.flush(response, { status: 201, statusText: 'Created' });
    expect(await result).toEqual(response);
  });

  it('updates all editable fields including REJECTED without sending metadata', async () => {
    const input = { ...response, status: 'REJECTED' as const };
    const result = firstValueFrom(service.update(42, input));
    const request = http.expectOne({ method: 'PUT', url: '/api/requests/42' });
    expect(request.request.body).toEqual({
      title: input.title, description: input.description, category: input.category,
      priority: input.priority, status: 'REJECTED',
    });
    request.flush({ ...input, needsAttention: false });
    expect(await result).toEqual({ ...input, needsAttention: false });
  });

  it('propagates list errors instead of returning a misleading empty list', async () => {
    const result = firstValueFrom(service.findAll());
    const assertion = expect(result).rejects.toMatchObject({ status: 500 });
    http.expectOne('/api/requests').flush(
      { message: 'An unexpected error occurred.' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    await assertion;
  });

  it('propagates a missing request error', async () => {
    const result = firstValueFrom(service.findById(42));
    const assertion = expect(result).rejects.toMatchObject({ status: 404 });
    http.expectOne('/api/requests/42').flush(
      { message: 'Request not found.' }, { status: 404, statusText: 'Not Found' },
    );
    await assertion;
  });

  it.each(['create', 'update'] as const)('propagates %s validation errors', async (operation) => {
    const result = firstValueFrom(operation === 'create'
      ? service.create(response) : service.update(42, response));
    const errorBody = { message: 'Validation failed.', fieldErrors: { title: 'Title is required.' } };
    const assertion = expect(result).rejects.toMatchObject({ status: 400, error: errorBody });
    http.expectOne(operation === 'create' ? '/api/requests' : '/api/requests/42')
      .flush(errorBody, { status: 400, statusText: 'Bad Request' });
    await assertion;
  });

  it('propagates network failures', async () => {
    const result = firstValueFrom(service.findAll());
    const assertion = expect(result).rejects.toBeInstanceOf(HttpErrorResponse);
    http.expectOne('/api/requests').error(new ProgressEvent('error'));
    await assertion;
  });
});
