import type { Venue } from '../../types/venue';
import { formatDistanceMiles } from '../../utils/distanceUtils';
import { formatTimeRange, minutesUntilEnd, formatCountdown } from '../../utils/timeUtils';
import { Squiggle } from '../Squiggle';

interface VenueCardProps {
  venue: Venue;
  onClick: () => void;
  animationIndex?: number;
}

export function VenueCard({ venue, onClick, animationIndex = 0 }: VenueCardProps) {
  const primaryWindow = venue.happyHours[0];
  const dealLine = venue.deals.map((d) => d.description).join(' · ');
  const timeLine = primaryWindow ? formatTimeRange(primaryWindow) : 'Hours not listed';

  const remaining = venue.isActiveNow ? minutesUntilEnd(venue.happyHours) : null;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={[
        'group relative cursor-pointer rounded-2xl border border-border bg-surface p-6 transition duration-200',
        'hover:-translate-y-1 hover:-rotate-[0.5deg] hover:border-accent/40 hover:shadow-card',
        'focus:outline-none focus:ring-2 focus:ring-accent/50',
        'opacity-0 animate-fade-in',
        venue.isActiveNow ? 'border-l-4 border-l-accent' : '',
      ].join(' ')}
      style={{ animationDelay: `${animationIndex * 60}ms` }}
    >
      {venue.isActiveNow && (
        <span className="absolute -top-3 left-5 -rotate-[4deg] rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-bg shadow-[2px_2px_0_rgba(0,0,0,0.12)]">
          Active Now
        </span>
      )}

      <span className="absolute right-5 top-5 text-sm text-text-secondary">
        {formatDistanceMiles(venue.distanceMiles)}
      </span>

      <h3 className="mt-1 mb-1 pr-14 font-display text-2xl font-semibold text-text-primary">
        {venue.name}
      </h3>
      <p className="text-sm text-text-secondary mb-2">{venue.address}</p>

      <Squiggle className="w-40 text-border" />

      {dealLine && (
        <p className="mt-3 mb-1.5 text-sm text-text-primary">
          <span className="mr-1" aria-hidden>
            🍷
          </span>
          {dealLine}
        </p>
      )}
      <p className="mb-4 font-display text-sm italic text-text-secondary">
        {timeLine}
        {remaining !== null && (
          <span className="font-sans font-semibold not-italic text-success">
            {' · '}
            {formatCountdown(remaining)}
          </span>
        )}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {venue.dealTypes.map((type) => (
            <span
              key={type}
              className="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium capitalize text-accent"
            >
              {type}
            </span>
          ))}
        </div>
        <span className="text-sm font-medium text-accent opacity-0 transition group-hover:opacity-100">
          → Details
        </span>
      </div>
    </article>
  );
}
