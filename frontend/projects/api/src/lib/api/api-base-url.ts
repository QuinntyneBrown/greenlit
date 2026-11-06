import { InjectionToken } from '@angular/core';

/** The origin of the Greenlit API, without a trailing slash. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** Joins the API origin and a path so neither a missing nor a doubled slash slips through. */
export function apiUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const rel = path.replace(/^\/+/, '');
  return `${base}/${rel}`;
}
