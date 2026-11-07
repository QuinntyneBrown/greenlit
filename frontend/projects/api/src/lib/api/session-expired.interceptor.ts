import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { API_BASE_URL } from './api-base-url';
import { problemCode } from './problem';
import { SESSION_STORE } from './session-store';

/**
 * A call the Greenlit API refuses with 401 `session_expired` (the token has lapsed, ADR-004) ends the
 * session and opens the session-expired page, which brings the person back to this page after they sign in
 * (L2-007). Any other failure is left to the page that made the call.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_BASE_URL).replace(/\/+$/, '');
  if (!request.url.startsWith(`${base}/`)) return next(request);
  const store = inject(SESSION_STORE);
  const router = inject(Router);
  return next(request).pipe(
    tap({
      error: (error: unknown) => {
        if (
          !(error instanceof HttpErrorResponse) ||
          error.status !== 401 ||
          problemCode(error) !== 'session_expired'
        )
          return;
        store.clear();
        if (router.url.startsWith('/session-expired')) return;
        void router.navigate(['/session-expired'], { queryParams: { returnUrl: router.url } });
      },
    }),
  );
};
