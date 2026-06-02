import type { HappyHourServiceInterface } from '../types/venue';
import { createMockHappyHourService } from './mockHappyHourService';
import { GeoapifyService } from './geoapifyService';

export function createHappyHourService(): HappyHourServiceInterface {
  if (import.meta.env.DEV) {
    return createMockHappyHourService();
  }
  return new GeoapifyService();
}
