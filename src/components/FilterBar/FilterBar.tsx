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
    <div className="flex w-full items-center justify-between rounded-full border border-border bg-surface px-2 py-1.5">
      {/* Tab group — left side */}
      <div className="flex items-center gap-0.5">
        {DEAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onDealFilterChange(opt.value)}
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              dealFilter === opt.value
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Controls — right side */}
      <div className="flex items-center gap-4 pr-2">
        {/* Active Now toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={activeOnly}
          onClick={() => onActiveOnlyChange(!activeOnly)}
          className="flex cursor-pointer items-center gap-2 text-sm transition"
        >
          <span className={`text-sm font-semibold ${activeOnly ? 'text-text-primary' : 'text-text-secondary'}`}>
            Active Now
          </span>
          <span
            className={[
              'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200',
              activeOnly ? 'bg-accent' : 'bg-border',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                activeOnly ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </span>
        </button>

        {/* Surprise me */}
        {onSurprise && (
          <button
            type="button"
            onClick={onSurprise}
            className="text-sm font-semibold text-text-secondary transition hover:text-text-primary"
          >
            🎲 Surprise Me
          </button>
        )}

        {/* Sort — styled to match the screenshot pill */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-bg px-4 py-1.5 text-sm font-semibold text-text-primary">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
