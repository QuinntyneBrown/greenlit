import { HttpErrorResponse } from '@angular/common/http';

/** The `code` extension of a ProblemDetails answer, when the API sent one (e.g. `confirmed_locked`). */
export function problemCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const code = (error.error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}
