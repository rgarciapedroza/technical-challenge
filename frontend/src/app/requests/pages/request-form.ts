import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, Subject, Subscription, switchMap } from 'rxjs';
import { RequestCategory, RequestPriority, RequestResponse, RequestStatus } from '../models/request';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../models/request-labels';
import { RequestService } from '../services/request.service';

function notBlank(control: AbstractControl) {
  return typeof control.value === 'string' && control.value.trim().length > 0
    ? null : { required: true };
}

type LoadResult =
  | { status: 'ready'; request?: RequestResponse }
  | { status: 'invalid' | 'not-found' | 'error' };

@Component({
  selector: 'app-request-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './request-form.html',
  styleUrl: './request-form.css',
})
export class RequestForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(RequestService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  private write?: Subscription;
  private generation = 0;
  private id: number | null = null;

  protected readonly editing = signal(false);
  protected readonly state = signal<'loading' | LoadResult['status']>('loading');
  protected readonly saving = signal(false);
  protected readonly saveError = signal(false);
  protected readonly categories = Object.entries(CATEGORY_LABELS);
  protected readonly priorities = Object.entries(PRIORITY_LABELS);
  protected readonly statuses = Object.entries(STATUS_LABELS);
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [notBlank, Validators.maxLength(120)] }),
    description: new FormControl('', { nonNullable: true, validators: [notBlank, Validators.maxLength(2000)] }),
    category: new FormControl<RequestCategory | ''>('', { nonNullable: true, validators: [Validators.required] }),
    priority: new FormControl<RequestPriority | ''>('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<RequestStatus>('OPEN', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    this.route.paramMap.pipe(
      switchMap((params) => {
        this.generation++;
        this.write?.unsubscribe();
        this.saving.set(false);
        this.saveError.set(false);
        this.form.reset();
        this.editing.set(this.route.snapshot.data['mode'] === 'edit');
        const raw = params.get('id');
        this.id = raw === null ? null : Number(raw);
        if (!this.editing()) return of<LoadResult>({ status: 'ready' });
        if (!raw || !/^[0-9]+$/.test(raw) || !Number.isSafeInteger(this.id) || this.id! <= 0) {
          return of<LoadResult>({ status: 'invalid' });
        }
        const id = this.id!;
        return this.reload.pipe(
          startWith(undefined),
          switchMap(() => {
            this.state.set('loading');
            return this.service.findById(id).pipe(
              map((request): LoadResult => ({ status: 'ready', request })),
              catchError((error: unknown) => of<LoadResult>({
                status: error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
              })),
            );
          }),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe((result) => {
      if (result.status === 'ready' && result.request) {
        const { title, description, category, priority, status } = result.request;
        this.form.reset({ title, description, category, priority, status });
      }
      this.state.set(result.status);
    });
    this.destroyRef.onDestroy(() => {
      this.generation++;
      this.write?.unsubscribe();
    });
  }

  protected retry(): void {
    this.reload.next();
  }

  protected submit(): void {
    if (this.state() !== 'ready' || this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { title, description, category, priority, status } = this.form.getRawValue();
    if (!category || !priority) return;
    const input = { title, description, category, priority };
    const operation = this.editing()
      ? this.service.update(this.id!, { ...input, status })
      : this.service.create(input);
    const generation = this.generation;
    this.saveError.set(false);
    this.saving.set(true);
    this.write = operation.subscribe({
      next: (request) => {
        if (generation !== this.generation) return;
        this.saving.set(false);
        void this.router.navigate(['/requests', request.id]);
      },
      error: () => {
        if (generation !== this.generation) return;
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }
}
