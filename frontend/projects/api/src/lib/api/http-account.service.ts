import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { Account } from '../models/account';
import { AccountService } from './account.service';
import { API_BASE_URL, apiUrl } from './api-base-url';

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
}
