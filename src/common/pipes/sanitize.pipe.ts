import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    return this.strip(value);
  }

  private strip(value: any): any {
    if (typeof value === 'string') return value.replace(/<[^>]*>/g, '').trim();
    if (Array.isArray(value)) return value.map((v) => this.strip(v));
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.strip(v)]));
    }
    return value;
  }
}
