import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, map, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import { RequestResponse } from '../models/request';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../models/request-labels';
import { RequestService } from '../services/request.service';

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; requests: RequestResponse[] };

@Component({
  selector: 'app-request-list',
  imports: [AsyncPipe, RouterLink, DatePipe],
  templateUrl: './request-list.html',
  styleUrl: './request-list.css',
})
export class RequestList {
  private readonly service = inject(RequestService);
  private readonly reload = new Subject<void>();
  protected readonly categories = CATEGORY_LABELS;
  protected readonly priorities = PRIORITY_LABELS;
  protected readonly statuses = STATUS_LABELS;

  protected readonly state$: Observable<ListState> = this.reload.pipe(
    startWith(undefined),
    switchMap(() => this.service.findAll().pipe(
      map((requests): ListState => ({ status: 'loaded', requests })),
      catchError(() => of<ListState>({ status: 'error' })),
      startWith<ListState>({ status: 'loading' }),
    )),
  );

  protected retry(): void {
    this.reload.next();
  }
}
