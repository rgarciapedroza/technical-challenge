import { Routes } from '@angular/router';
import { RequestList } from './requests/pages/request-list';
import { RequestDetails } from './requests/pages/request-details';
import { RequestForm } from './requests/pages/request-form';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'requests' },
  { path: 'requests', component: RequestList, title: 'Requests | Internal Requests' },
  { path: 'requests/new', component: RequestForm, data: { mode: 'create' }, title: 'New request | Internal Requests' },
  { path: 'requests/:id/edit', component: RequestForm, data: { mode: 'edit' }, title: 'Edit request | Internal Requests' },
  { path: 'requests/:id', component: RequestDetails, title: 'Request details | Internal Requests' },
  { path: '**', redirectTo: 'requests' },
];
