import { ExternalServiceError } from './external-service.error.js';

export class OverpassApiError extends ExternalServiceError {
  constructor(message = 'Overpass API unavailable', originalStatus?: number) {
    super('Overpass', message, originalStatus);
  }
}
