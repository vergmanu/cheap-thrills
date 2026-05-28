interface EmptyStateProps {
  zipCode: string;
  onTryAgain: () => void;
}

export function EmptyState({ zipCode, onTryAgain }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-border bg-surface px-8 py-12 text-center">
      <p className="font-display text-2xl text-text-primary mb-2">
        No happy hours found near {zipCode}.
      </p>
      <p className="text-text-secondary mb-6 max-w-md mx-auto">
        Try expanding your search radius or check a nearby zip code — deals change
        by neighborhood.
      </p>
      <button
        type="button"
        onClick={onTryAgain}
        className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-bg transition hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}
