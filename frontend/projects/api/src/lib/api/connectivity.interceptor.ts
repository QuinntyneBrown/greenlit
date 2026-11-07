import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

import { API_BASE_URL } from './api-base-url';
import { CONNECTIVITY_SERVICE } from './connectivity.service';

/** Tells the connectivity service how each call to the Greenlit API went (L2-045, ADR-012). */
export const connectivityInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_BASE_URL).replace(/\/+$/, '');
  if (!request.url.startsWith(`${base}/`)) return next(request);
  const connectivity = inject(CONNECTIVITY_SERVICE);
  const call = `${request.method} ${request.url.split('?')[0]}`;
  return next(request).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) connectivity.succeeded(call);
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) connectivity.failed(error.status, call);
      },
    }),
  );
};
