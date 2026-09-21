import { AsyncPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import { RequestResponse } from '../models/request';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../models/request-labels';
import { RequestService } from '../services/request.service';

type DetailState =
  | { status: 'loading' | 'invalid' | 'not-found' | 'error' }
  | { status: 'loaded'; request: RequestResponse };

@Component({
  selector: 'app-request-details',
  imports: [AsyncPipe, DatePipe, RouterLink],
  templateUrl: './request-details.html',
  styleUrl: './request-details.css',
})
export class RequestDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(RequestService);
  private readonly reload = new Subject<void>();
  protected readonly categories = CATEGORY_LABELS;
  protected readonly priorities = PRIORITY_LABELS;
  protected readonly statuses = STATUS_LABELS;

  protected readonly state$: Observable<DetailState> = this.route.paramMap.pipe(
    map((params) => params.get('id')),
    distinctUntilChanged(),
    switchMap((rawId) => {
      const id = Number(rawId);
      if (!rawId || !/^[0-9]+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0) {
        return of<DetailState>({ status: 'invalid' });
      }
      return this.reload.pipe(
        startWith(undefined),
        switchMap(() => this.service.findById(id).pipe(
          map((request): DetailState => ({ status: 'loaded', request })),
          catchError((error: unknown) => of<DetailState>({
            status: error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
          })),
          startWith<DetailState>({ status: 'loading' }),
        )),
      );
    }),
  );

  protected retry(): void {
    this.reload.next();
  }
}
