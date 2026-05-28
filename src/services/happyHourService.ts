import type { HappyHourServiceInterface } from '../types/venue';
import { createMockHappyHourService } from './mockHappyHourService';
import { GooglePlacesService } from './googlePlacesService';

export function createHappyHourService(): HappyHourServiceInterface {
  if (import.meta.env.DEV) {
    return createMockHappyHourService();
  }
  return new GooglePlacesService();
}
