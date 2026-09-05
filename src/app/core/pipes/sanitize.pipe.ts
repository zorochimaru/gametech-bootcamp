import { inject, Pipe, PipeTransform } from '@angular/core';
import {
  DomSanitizer,
  SafeHtml,
  SafeResourceUrl,
  SafeUrl
} from '@angular/platform-browser';

@Pipe({
  name: 'sanitize',
  standalone: true
})
export class SanitizePipe implements PipeTransform {
  readonly #sanitizer = inject(DomSanitizer);

  transform(value: string, type: 'html'): SafeHtml;

  transform(value: string, type: 'resource'): SafeResourceUrl;

  transform(value: string, type: 'url'): SafeUrl;

  transform(
    value: string,
    type: 'html' | 'resource' | 'url'
  ): SafeHtml | SafeResourceUrl | SafeUrl {
    switch (type) {
      case 'html':
        return this.#sanitizer.bypassSecurityTrustHtml(value);
      case 'resource':
        return this.#sanitizer.bypassSecurityTrustResourceUrl(value);
      case 'url':
        return this.#sanitizer.bypassSecurityTrustUrl(value);
      default:
        return '';
    }
  }
}
