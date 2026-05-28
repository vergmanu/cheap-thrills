import type { DealTypeFilter, SortOption, Venue } from '../types/venue';

export function filterAndSortVenues(
  venues: Venue[],
  dealFilter: DealTypeFilter,
  activeOnly: boolean,
  sortBy: SortOption,
): Venue[] {
  let result = [...venues];

  if (dealFilter !== 'all') {
    result = result.filter((venue) => {
      if (dealFilter === 'both') {
        return venue.dealTypes.includes('drinks') && venue.dealTypes.includes('food');
      }
      return venue.dealTypes.includes(dealFilter);
    });
  }

  if (activeOnly) {
    result = result.filter((venue) => venue.isActiveNow);
  }

  result.sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return a.distanceMiles - b.distanceMiles;
      case 'rating': {
        const ratingA = a.rating ?? -1;
        const ratingB = b.rating ?? -1;
        return ratingB - ratingA;
      }
      case 'alphabetical':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return result;
}
