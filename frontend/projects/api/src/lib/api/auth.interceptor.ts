import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_BASE_URL } from './api-base-url';
import { SESSION_STORE } from './session-store';

/** Sends the session's bearer token to the Greenlit API, and only to it. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_BASE_URL).replace(/\/+$/, '');
  const token = inject(SESSION_STORE).token();
  if (!token || !request.url.startsWith(`${base}/`)) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
