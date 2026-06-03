// import type { HappyHourServiceInterface } from '../types/venue';
// import { createMockHappyHourService } from './mockHappyHourService';
// import { GeoapifyService } from './eventaiService';

// export function createHappyHourService(): HappyHourServiceInterface {
//   if (import.meta.env.DEV) {
//     return createMockHappyHourService();
//   }
//   return new GeoapifyService();
// }
import { createMockHappyHourService } from './mockHappyHourService';
import { EventAIService } from './eventaiService';

export function createHappyHourService() {
  return import.meta.env.DEV
    ? createMockHappyHourService()
    : new EventAIService();
}