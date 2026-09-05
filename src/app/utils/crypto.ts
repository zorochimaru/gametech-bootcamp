import { from, map, Observable } from 'rxjs';

export function randomUUID(): string {
  return crypto.randomUUID();
}

export function hash(string: string): Observable<string> {
  return from(
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(string))
  ).pipe(
    map(hashBuffer =>
      Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    )
  );
}
