import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { SchoolClosure, SchoolClosureInput } from '../models/school-closure';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { problemCode } from './problem';
import {
  AddChildResult,
  AddedChild,
  ImportCalendarResult,
  SaveClosureResult,
  SchoolCalendarSaveResult,
  SchoolCalendarService,
} from './school-calendar.service';

/** The school calendar endpoints of the API (docs/detailed-designs/teams/school-calendar). */
@Injectable({ providedIn: 'root' })
export class HttpSchoolCalendarService implements SchoolCalendarService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  save(on: boolean): Observable<SchoolCalendarSaveResult> {
    return this.http
      .put(apiUrl(this.baseUrl, 'api/team/settings/school-calendar'), { schoolCalendar: on })
      .pipe(
        map((): SchoolCalendarSaveResult => ({ ok: true })),
        catchError(() => of<SchoolCalendarSaveResult>({ ok: false })),
      );
  }

  closures(): Observable<readonly SchoolClosure[]> {
    return this.http.get<readonly SchoolClosure[]>(apiUrl(this.baseUrl, 'api/team/closures'));
  }

  addClosure(input: SchoolClosureInput): Observable<SaveClosureResult> {
    return this.saved(
      this.http.post<SchoolClosure>(apiUrl(this.baseUrl, 'api/team/closures'), input),
    );
  }

  updateClosure(id: string, input: SchoolClosureInput): Observable<SaveClosureResult> {
    return this.saved(
      this.http.put<SchoolClosure>(
        apiUrl(this.baseUrl, `api/team/closures/${encodeURIComponent(id)}`),
        input,
      ),
    );
  }

  deleteClosure(id: string): Observable<SchoolCalendarSaveResult> {
    return this.http
      .delete(apiUrl(this.baseUrl, `api/team/closures/${encodeURIComponent(id)}`))
      .pipe(
        map((): SchoolCalendarSaveResult => ({ ok: true })),
        catchError(() => of<SchoolCalendarSaveResult>({ ok: false })),
      );
  }

  importCalendar(memberId: string, file: Blob, fileName: string): Observable<ImportCalendarResult> {
    const body = new FormData();
    body.append('file', file, fileName);
    return this.http
      .post<{ imported: number }>(
        apiUrl(this.baseUrl, `api/team/children/${encodeURIComponent(memberId)}/calendar`),
        body,
      )
      .pipe(
        map((r): ImportCalendarResult => ({ outcome: 'imported', imported: r.imported })),
        catchError((error: unknown) =>
          of<ImportCalendarResult>({
            outcome: problemCode(error) === 'calendar_unreadable' ? 'unreadable' : 'failed',
          }),
        ),
      );
  }

  private saved(request: Observable<SchoolClosure>): Observable<SaveClosureResult> {
    return request.pipe(
      map((closure): SaveClosureResult => ({ outcome: 'saved', closure })),
      catchError(() => of<SaveClosureResult>({ outcome: 'failed' })),
    );
  }

  addChild(name: string, email: string | null): Observable<AddChildResult> {
    return this.http
      .post<AddedChild>(apiUrl(this.baseUrl, 'api/team/children'), { name, email })
      .pipe(
        map((child): AddChildResult => ({ outcome: 'added', child })),
        catchError(() => of<AddChildResult>({ outcome: 'failed' })),
      );
  }
}
