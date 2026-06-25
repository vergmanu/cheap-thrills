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
    <div className="w-full rounded-2xl border border-border bg-surface px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-2 sm:py-1.5 sm:gap-1">

      {/* Row 1 — Deal tabs + Sort dropdown */}
      <div className="flex items-center justify-between gap-2 w-full sm:w-auto sm:justify-start">
        <div className="flex items-center gap-0.5">
          {DEAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onDealFilterChange(opt.value)}
              className={[
                'rounded-full px-4 py-2 text-sm font-semibold transition text-center',
                dealFilter === opt.value
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown — mobile only */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-bg px-4 py-1.5 sm:hidden">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-sm font-semibold text-text-primary focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Divider — mobile only */}
      <div className="h-px bg-border w-full sm:hidden" />

      {/* Row 2 — Active Now + Surprise Me */}
      <div className="flex items-center justify-start gap-4 px-1 sm:px-0 sm:pr-2 sm:justify-end">

        {/* Active Now toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={activeOnly}
          onClick={() => onActiveOnlyChange(!activeOnly)}
          className="flex items-center gap-2 cursor-pointer transition"
        >
          <span className={`text-sm font-semibold whitespace-nowrap ${activeOnly ? 'text-text-primary' : 'text-text-secondary'}`}>
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

        {/* Surprise Me */}
        {onSurprise && (
          <button
            type="button"
            onClick={onSurprise}
            className="flex items-center gap-2 text-sm font-semibold text-text-secondary transition hover:text-text-primary whitespace-nowrap"
          >
            <span>Surprise Me</span>
            <span>🎲</span>
          </button>
        )}

        {/* Sort dropdown — desktop only */}
        <div className="hidden sm:flex items-center gap-1 rounded-full border border-border bg-bg px-4 py-1.5">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-sm font-semibold text-text-primary focus:outline-none cursor-pointer"
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