import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Person } from '../models/person';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { PersonService } from './person.service';

/** GET /api/people/{id}. The response is the view model; no mapping is needed. */
@Injectable({ providedIn: 'root' })
export class HttpPersonService implements PersonService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get(id: string): Observable<Person> {
    return this.http.get<Person>(apiUrl(this.baseUrl, `api/people/${encodeURIComponent(id)}`));
  }
}
