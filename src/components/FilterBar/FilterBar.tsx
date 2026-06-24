import type { DealTypeFilter, SortOption } from '../../types/venue';

interface FilterBarProps {
  dealFilter: DealTypeFilter;
  activeOnly: boolean;
  sortBy: SortOption;
  onDealFilterChange: (filter: DealTypeFilter) => void;
  onActiveOnlyChange: (active: boolean) => void;
  onSortChange: (sort: SortOption) => void;
  onSurprise?: () => void;
}

const DEAL_OPTIONS: { value: DealTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'food', label: 'Food' },
  { value: 'both', label: 'Both' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
  { value: 'alphabetical', label: 'A–Z' },
];

export function FilterBar({
  dealFilter,
  activeOnly,
  sortBy,
  onDealFilterChange,
  onActiveOnlyChange,
  onSortChange,
  onSurprise,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1.5">
        {DEAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onDealFilterChange(opt.value)}
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              dealFilter === opt.value
                ? 'bg-accent text-bg'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <span>Active Now</span>
          <button
            type="button"
            role="switch"
            aria-checked={activeOnly}
            onClick={() => onActiveOnlyChange(!activeOnly)}
            className={[
              'relative h-6 w-11 rounded-full transition',
              activeOnly ? 'bg-success' : 'bg-border',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition',
                activeOnly ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </label>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-text-primary focus:border-accent focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {onSurprise && (
          <button
            type="button"
            onClick={onSurprise}
            className="rounded-full border border-accent-muted bg-surface px-4 py-2.5 text-sm font-bold text-text-primary shadow-glow transition hover:-translate-y-px hover:shadow-glow-lg"
          >
            🎲 Surprise me
          </button>
        )}
      </div>
    </div>
  );
}
