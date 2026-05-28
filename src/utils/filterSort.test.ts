import { describe, expect, it } from 'vitest';
import { filterAndSortVenues } from './filterSort';
import type { Venue } from '../types/venue';

const baseVenue = (overrides: Partial<Venue>): Venue => ({
  id: '1',
  name: 'A',
  address: '',
  distanceMiles: 1,
  happyHours: [],
  deals: [],
  dealTypes: ['drinks'],
  isActiveNow: false,
  mapsUrl: '',
  ...overrides,
});

describe('filterAndSortVenues', () => {
  const venues: Venue[] = [
    baseVenue({ id: '1', name: 'Zebra', distanceMiles: 2, rating: 3, dealTypes: ['drinks'] }),
    baseVenue({ id: '2', name: 'Alpha', distanceMiles: 1, rating: 5, dealTypes: ['food'], isActiveNow: true }),
    baseVenue({
      id: '3',
      name: 'Both',
      distanceMiles: 3,
      dealTypes: ['drinks', 'food'],
      isActiveNow: true,
    }),
  ];

  it('filters by deal type', () => {
    const foodOnly = filterAndSortVenues(venues, 'food', false, 'distance');
    expect(foodOnly.map((v) => v.id)).toEqual(['2', '3']);
  });

  it('filters active only', () => {
    const active = filterAndSortVenues(venues, 'all', true, 'distance');
    expect(active).toHaveLength(2);
  });

  it('sorts by distance', () => {
    const sorted = filterAndSortVenues(venues, 'all', false, 'distance');
    expect(sorted.map((v) => v.distanceMiles)).toEqual([1, 2, 3]);
  });
});
