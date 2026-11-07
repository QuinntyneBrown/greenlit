import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { API_BASE_URL } from './api-base-url';

/** The error reference of a 500 ProblemDetails answer (`7F3A-91C2`), when the API sent one. */
export function problemReference(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 500) return null;
  const reference = (error.error as { reference?: unknown } | null)?.reference;
  return typeof reference === 'string' && reference !== '' ? reference : null;
}

/**
 * A page that cannot load because the Greenlit API failed with an unexpected 500 (one that carries an
 * error reference) opens the server-error page, which shows the reference and offers to try the page again
 * (L2-046 AC3). Only reads count: a change that fails is reported where it was made. Errors without a
 * reference are left to the page that made the call.
 */
export const serverErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_BASE_URL).replace(/\/+$/, '');
  if (request.method !== 'GET' || !request.url.startsWith(`${base}/`)) return next(request);
  const router = inject(Router);
  return next(request).pipe(
    tap({
      error: (error: unknown) => {
        const reference = problemReference(error);
        if (reference === null || router.url.startsWith('/server-error')) return;
        const returnUrl = router.currentNavigation()?.extractedUrl.toString() ?? router.url;
        void router.navigate(['/server-error'], {
          queryParams: { reference, returnUrl },
          replaceUrl: true,
        });
      },
    }),
  );
};
