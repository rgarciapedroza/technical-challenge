import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('provides navigation and an accessible content target', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('nav a')?.textContent).toContain('Internal Requests');
    expect(element.querySelector('a[href="/requests/new"]')?.textContent).toContain('New request');
    expect(element.querySelector('main#main-content')).not.toBeNull();
  });
});
