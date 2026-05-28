import type { HappyHourServiceInterface } from '../types/venue';
import { createMockHappyHourService } from './mockHappyHourService';
import { FoursquareService } from './foursquareService';

export function createHappyHourService(): HappyHourServiceInterface {
  if (import.meta.env.DEV) {
    return createMockHappyHourService();
  }
  return new FoursquareService();
}
