import type { Venue } from '../../types/venue';
import { VenueCard } from '../VenueCard';

interface ResultsGridProps {
  venues: Venue[];
  zipCode: string;
  onVenueClick: (venue: Venue) => void;
  onEditZip: () => void;
}

export function ResultsGrid({
  venues,
  zipCode,
  onVenueClick,
  onEditZip,
}: ResultsGridProps) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-text-secondary">
          <span className="text-text-primary font-semibold">{venues.length}</span>{' '}
          {venues.length === 1 ? 'deal' : 'deals'} near{' '}
          <span className="inline-flex items-center gap-1 text-accent">
            {zipCode}
            <button
              type="button"
              onClick={onEditZip}
              aria-label="Edit zip code"
              className="rounded p-0.5 text-text-secondary transition hover:text-accent"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="m2.695 14.363 2.284-2.284 9.9 9.9-2.284 2.284-9.9-9.9Zm12.727-6.99 1.414-1.414a1 1 0 0 0 0-1.414l-2.829-2.829a1 1 0 0 0-1.414 0l-1.414 1.414 4.243 4.243ZM4 18h14v2H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2v14Z" />
              </svg>
            </button>
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
