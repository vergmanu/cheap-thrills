import type { HappyHourQuery, HappyHourServiceInterface, Venue } from '../types/venue';

const MOCK_VENUES: Omit<Venue, 'isActiveNow'>[] = [
  {
    id: 'mock-1',
    name: 'The Rusty Anchor',
    address: '123 Main St, Los Angeles, CA 90210',
    distanceMiles: 0.3,
    happyHours: [
      { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '15:00', endTime: '18:00' },
    ],
    deals: [
      { description: '50% off drafts', type: 'drinks' },
      { description: '$5 wells', type: 'drinks' },
    ],
    dealTypes: ['drinks'],
    rating: 4.5,
    websiteUrl: 'https://example.com/rusty-anchor',
    phoneNumber: '(310) 555-0101',
    mapsUrl: 'https://maps.google.com/?q=The+Rusty+Anchor+Los+Angeles',
  },
  {
    id: 'mock-2',
    name: 'Golden Hour Tavern',
    address: '456 Sunset Blvd, Los Angeles, CA 90210',
    distanceMiles: 0.7,
    happyHours: [
      { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '16:00', endTime: '19:00' },
    ],
    deals: [
      { description: '$6 craft cocktails', type: 'drinks' },
      { description: '$8 sliders (2 for $14)', type: 'food' },
    ],
    dealTypes: ['drinks', 'food'],
    rating: 4.2,
    phoneNumber: '(310) 555-0102',
    mapsUrl: 'https://maps.google.com/?q=Golden+Hour+Tavern',
  },
  {
    id: 'mock-3',
    name: 'Neon Noodle Bar',
    address: '789 Vine St, Los Angeles, CA 90210',
    distanceMiles: 1.1,
    happyHours: [
      { days: ['Tue', 'Wed', 'Thu'], startTime: '17:00', endTime: '19:00' },
    ],
    deals: [
      { description: 'Half-price ramen bowls', type: 'food' },
      { description: '$4 sake bombs', type: 'drinks' },
    ],
    dealTypes: ['drinks', 'food'],
    rating: 4.7,
    websiteUrl: 'https://example.com/neon-noodle',
    mapsUrl: 'https://maps.google.com/?q=Neon+Noodle+Bar',
  },
  {
    id: 'mock-4',
    name: 'Midnight Martini Club',
    address: '321 Wilshire Blvd, Los Angeles, CA 90210',
    distanceMiles: 1.8,
    happyHours: [
      { days: ['Thu', 'Fri'], startTime: '18:00', endTime: '20:00' },
    ],
    deals: [{ description: '$10 premium martinis', type: 'drinks' }],
    dealTypes: ['drinks'],
    rating: 4.9,
    phoneNumber: '(310) 555-0104',
    mapsUrl: 'https://maps.google.com/?q=Midnight+Martini+Club',
  },
  {
    id: 'mock-5',
    name: 'Casa del Taco',
    address: '555 Pico Blvd, Los Angeles, CA 90210',
    distanceMiles: 2.2,
    happyHours: [
      { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '14:00', endTime: '17:00' },
    ],
    deals: [
      { description: '$2 tacos', type: 'food' },
      { description: '$3 margaritas', type: 'drinks' },
    ],
    dealTypes: ['drinks', 'food'],
    rating: 4.0,
    mapsUrl: 'https://maps.google.com/?q=Casa+del+Taco',
  },
  {
    id: 'mock-6',
    name: 'The Velvet Lounge',
    address: '888 La Cienega Blvd, Los Angeles, CA 90210',
    distanceMiles: 2.9,
    happyHours: [
      { days: ['Wed', 'Thu', 'Fri'], startTime: '17:00', endTime: '19:30' },
    ],
    deals: [{ description: 'Buy one get one wine by the glass', type: 'drinks' }],
    dealTypes: ['drinks'],
    rating: 4.4,
    websiteUrl: 'https://example.com/velvet-lounge',
    mapsUrl: 'https://maps.google.com/?q=Velvet+Lounge',
  },
  {
    id: 'mock-7',
    name: 'Harbor View Brewery',
    address: '100 Ocean Ave, Santa Monica, CA 90401',
    distanceMiles: 3.5,
    happyHours: [
      { days: ['Mon', 'Wed', 'Fri'], startTime: '15:00', endTime: '18:00' },
    ],
    deals: [
      { description: '$4 pints', type: 'drinks' },
      { description: '$6 pretzel bites', type: 'food' },
    ],
    dealTypes: ['drinks', 'food'],
    rating: 4.3,
    phoneNumber: '(310) 555-0107',
    mapsUrl: 'https://maps.google.com/?q=Harbor+View+Brewery',
  },
  {
    id: 'mock-8',
    name: 'Slice & Sip Pizza',
    address: '222 Broadway, Santa Monica, CA 90401',
    distanceMiles: 4.1,
    happyHours: [
      { days: ['Tue', 'Thu'], startTime: '16:00', endTime: '18:00' },
    ],
    deals: [{ description: '$3 slices + $5 beer combos', type: 'food' }],
    dealTypes: ['food'],
    rating: 3.9,
    mapsUrl: 'https://maps.google.com/?q=Slice+and+Sip',
  },
  {
    id: 'mock-9',
    name: 'The Copper Still',
    address: '77 Abbot Kinney Blvd, Venice, CA 90291',
    distanceMiles: 4.6,
    happyHours: [
      { days: ['Sun', 'Mon', 'Tue'], startTime: '12:00', endTime: '15:00' },
    ],
    deals: [
      { description: '$7 whiskey flights', type: 'drinks' },
      { description: 'Half-off appetizers', type: 'food' },
    ],
    dealTypes: ['drinks', 'food'],
    rating: 4.6,
    websiteUrl: 'https://example.com/copper-still',
    phoneNumber: '(310) 555-0109',
    mapsUrl: 'https://maps.google.com/?q=Copper+Still+Venice',
  },
  {
    id: 'mock-10',
    name: 'Rooftop Reverie',
    address: '999 Century Park E, Los Angeles, CA 90067',
    distanceMiles: 4.9,
    happyHours: [
      { days: ['Fri', 'Sat'], startTime: '17:00', endTime: '19:00' },
    ],
    deals: [{ description: '$12 signature cocktails with skyline views', type: 'drinks' }],
    dealTypes: ['drinks'],
    rating: 4.8,
    websiteUrl: 'https://example.com/rooftop-reverie',
    mapsUrl: 'https://maps.google.com/?q=Rooftop+Reverie',
  },
];

export function createMockHappyHourService(): HappyHourServiceInterface {
  return {
    async getVenues(
      _query: HappyHourQuery,
      _options?: { signal?: AbortSignal },
    ): Promise<Venue[]> {
      await new Promise((resolve) => setTimeout(resolve, 600));

      return MOCK_VENUES.map((venue) => ({
        ...venue,
        isActiveNow: false,
      }));
    },
  };
}
