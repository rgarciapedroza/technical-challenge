import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateRequestRequest, RequestResponse, UpdateRequestRequest } from '../models/request';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/requests';

  findAll(): Observable<RequestResponse[]> {
    return this.http.get<RequestResponse[]>(this.url);
  }

  findById(id: number): Observable<RequestResponse> {
    return this.http.get<RequestResponse>(`${this.url}/${id}`);
  }

  create(input: CreateRequestRequest): Observable<RequestResponse> {
    const { title, description, category, priority } = input;
    return this.http.post<RequestResponse>(this.url, { title, description, category, priority });
  }

  update(id: number, input: UpdateRequestRequest): Observable<RequestResponse> {
    const { title, description, category, priority, status } = input;
    return this.http.put<RequestResponse>(`${this.url}/${id}`, {
      title, description, category, priority, status,
    });
  }
}
