import type { Venue } from '../../types/venue';
import { formatDistanceMiles } from '../../utils/distanceUtils';
import { formatTimeRange } from '../../utils/timeUtils';

interface VenueCardProps {
  venue: Venue;
  onClick: () => void;
  animationIndex?: number;
}

export function VenueCard({ venue, onClick, animationIndex = 0 }: VenueCardProps) {
  const primaryWindow = venue.happyHours[0];
  const dealLine = venue.deals.map((d) => d.description).join(' · ');
  const timeLine = primaryWindow ? formatTimeRange(primaryWindow) : 'Hours not listed';

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
        'group cursor-pointer rounded-xl border border-border bg-surface p-5 transition',
        'hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-black/30',
        'focus:outline-none focus:ring-2 focus:ring-accent/50',
        'opacity-0 animate-fade-in',
        venue.isActiveNow ? 'border-l-4 border-l-accent' : '',
      ].join(' ')}
      style={{ animationDelay: `${animationIndex * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          {venue.isActiveNow && (
            <span className="inline-block rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent shadow-[0_0_12px_rgba(245,166,35,0.45)]">
              Active Now
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm text-text-secondary">
          {formatDistanceMiles(venue.distanceMiles)}
        </span>
      </div>

      <h3 className="font-display text-xl font-semibold text-text-primary mb-1">
        {venue.name}
      </h3>
      <p className="text-sm text-text-secondary mb-4">{venue.address}</p>

      <div className="h-px bg-border mb-4" />

      {dealLine && (
        <p className="text-sm text-text-primary mb-2">
          <span className="mr-1" aria-hidden>
            🍺
          </span>
          {dealLine}
        </p>
      )}
      <p className="font-mono text-xs text-text-secondary mb-4">
        <span className="mr-1" aria-hidden>
          🕐
        </span>
        {timeLine}
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
        <span className="text-sm text-accent opacity-0 transition group-hover:opacity-100">
          → Details
        </span>
      </div>
    </article>
  );
}
