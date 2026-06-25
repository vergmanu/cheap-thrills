import { useEffect } from 'react';
import type { Venue } from '../../types/venue';
import { formatDistanceMiles } from '../../utils/distanceUtils';
import { formatTimeRange } from '../../utils/timeUtils';

interface VenueDetailProps {
  venue: Venue;
  onClose: () => void;
}

function buildShareText(venue: Venue): string {
  const zip = venue.address.match(/\d{5}/)?.[0] ?? '';
  const deepLink = zip
    ? `https://cheap-thrills.vercel.app/?zip=${zip}`
    : `https://cheap-thrills.vercel.app`;

  const lines: string[] = [
    `Check out ${venue.name} for happy hour!`,
    `\n📍 ${venue.address}`,
  ];

  if (venue.happyHours.length > 0) {
    lines.push(`⏰ ${venue.happyHours.map(formatTimeRange).join(', ')}`);
  }

  if (venue.deals.length > 0) {
    lines.push(`🎉 ${venue.deals.map((d) => d.description).join(' · ')}`);
  }

  lines.push(`\nFind more happy hours near you: ${deepLink}`);

  return lines.join('\n');
}

export function VenueDetail({ venue, onClose }: VenueDetailProps) {
  const handleShare = async () => {
    const text = buildShareText(venue);
    await navigator.share({ title: venue.name, text });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-2xl animate-[slideIn_0.3s_ease-out]"
        style={{
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        <header className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            {venue.isActiveNow && (
              <span className="mb-2 inline-block rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold uppercase text-accent">
                Active Now
              </span>
            )}
            <h2 className="font-display text-2xl font-semibold text-text-primary">
              {venue.name}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{venue.address}</p>
            <p className="mt-1 text-sm text-text-secondary">
              {formatDistanceMiles(venue.distanceMiles)}
              {venue.rating !== undefined && (
                <span className="ml-2">· ★ {venue.rating.toFixed(1)}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-text-secondary transition hover:bg-border hover:text-text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="font-semibold text-text-primary mb-3">Deals</h3>
            {venue.deals.length === 0 ? (
              <p className="text-sm text-text-secondary">No deals listed yet.</p>
            ) : (
              <ul className="space-y-2">
                {venue.deals.map((deal, i) => (
                  <li
                    key={`${deal.type}-${i}`}
                    className="flex items-start gap-2 text-sm text-text-primary"
                  >
                    <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs capitalize text-accent">
                      {deal.type}
                    </span>
                    {deal.description}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="font-semibold text-text-primary mb-3">Happy Hour Schedule</h3>
            {venue.happyHours.length === 0 ? (
              <p className="text-sm text-text-secondary">Schedule not available.</p>
            ) : (
              <ul className="space-y-2 font-mono text-sm text-text-secondary">
                {venue.happyHours.map((window, i) => (
                  <li key={i}>{formatTimeRange(window)}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <a
              href={venue.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Open in Google Maps →
            </a>
            {venue.websiteUrl && (
              <a
                href={venue.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Visit website →
              </a>
            )}
            {venue.phoneNumber && (
              <a href={`tel:${venue.phoneNumber}`} className="text-accent hover:underline">
                {venue.phoneNumber}
              </a>
            )}
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                type="button"
                onClick={handleShare}
                className="sm:hidden mt-2 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Share via text 📤
              </button>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
