import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { Account } from '../models/account';
import { AccountService, ChangePasswordResult } from './account.service';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { problemCode } from './problem';

/** GET /api/account, PUT /api/account/profile and PUT /api/account/password. */
@Injectable({ providedIn: 'root' })
export class HttpAccountService implements AccountService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get(): Observable<Account | null> {
    return this.http
      .get<Account>(apiUrl(this.baseUrl, 'api/account'))
      .pipe(catchError(() => of(null)));
  }

  changePassword(current: string, next: string, confirm: string): Observable<ChangePasswordResult> {
    return this.http
      .put<void>(apiUrl(this.baseUrl, 'api/account/password'), {
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      })
      .pipe(
        map((): ChangePasswordResult => ({ outcome: 'updated' })),
        catchError((error: unknown) =>
          of<ChangePasswordResult>(
            error instanceof HttpErrorResponse &&
              error.status === 400 &&
              problemCode(error) === 'current_password_wrong'
              ? { outcome: 'current-wrong' }
              : { outcome: 'failed' },
          ),
        ),
      );
  }
}
