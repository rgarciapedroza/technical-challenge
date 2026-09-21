import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-request-form',
  template: '<h1>{{ routeData()?.["mode"] === "edit" ? "Edit request" : "New request" }}</h1>',
})
export class RequestForm {
  protected readonly routeData = toSignal(inject(ActivatedRoute).data);
}
