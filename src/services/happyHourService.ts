import { createMockHappyHourService } from './mockHappyHourService';
import { SupabaseVenueService } from './supabaseVenueService';

export function createHappyHourService() {
  return import.meta.env.DEV
    ? createMockHappyHourService()
    : new SupabaseVenueService();
}