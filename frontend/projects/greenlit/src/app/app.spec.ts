import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import {
  AUTH_SERVICE,
  CONNECTIVITY_SERVICE,
  REQUEST_SERVICE,
  SESSION_STORE,
  TEAM_SERVICE,
} from 'api';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: SESSION_STORE,
          useValue: { isManager: () => false, isSignedIn: () => false, token: () => null },
        },
        { provide: AUTH_SERVICE, useValue: { account: () => of(null) } },
        { provide: REQUEST_SERVICE, useValue: {} },
        { provide: TEAM_SERVICE, useValue: {} },
        {
          provide: CONNECTIVITY_SERVICE,
          useValue: {
            state: signal('online'),
            readOnly: signal(false),
            reloads: signal(0),
            lastSync: signal(new Date()),
            succeeded: () => undefined,
            failed: () => undefined,
            retry: () => undefined,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the main landmark the skip link targets', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main#main')).not.toBeNull();
    expect(compiled.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main');
  });
});
