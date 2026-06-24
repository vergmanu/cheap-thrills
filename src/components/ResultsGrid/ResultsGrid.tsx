import type { Venue } from '../../types/venue';
import { VenueCard } from '../VenueCard';

interface ResultsGridProps {
  venues: Venue[];
  onVenueClick: (venue: Venue) => void;
}

export function ResultsGrid({ venues, onVenueClick }: ResultsGridProps) {
  return (
    <section>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {venues.map((venue, index) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            onClick={() => onVenueClick(venue)}
            animationIndex={index}
          />
        ))}
      </div>
    </section>
  );
}
