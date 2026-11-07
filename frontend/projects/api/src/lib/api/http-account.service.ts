import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { Account } from '../models/account';
import { AccountService, ChangePasswordResult, UpdateProfileResult } from './account.service';
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

  updateProfile(displayName: string, email: string): Observable<UpdateProfileResult> {
    return this.http
      .put<Account>(apiUrl(this.baseUrl, 'api/account/profile'), { displayName, email })
      .pipe(
        map((account): UpdateProfileResult => ({ outcome: 'saved', account })),
        catchError((error: unknown) =>
          of<UpdateProfileResult>(
            error instanceof HttpErrorResponse &&
              error.status === 409 &&
              problemCode(error) === 'email_taken'
              ? { outcome: 'email-taken' }
              : { outcome: 'failed' },
          ),
        ),
      );
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
