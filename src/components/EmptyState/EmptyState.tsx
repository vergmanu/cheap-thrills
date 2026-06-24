interface EmptyStateProps {
  zipCode: string;
  onTryAgain: () => void;
}

export function EmptyState({ zipCode, onTryAgain }: EmptyStateProps) {
  return (
    <div className="px-8 py-12 text-center">
      <img
        src="/illustrations/pour.png"
        alt=""
        className="mx-auto mb-4 w-72 max-w-full"
      />
      <p className="mb-2 font-display text-3xl font-bold text-text-primary">
        No happy hours near {zipCode} — yet.
      </p>
      <p className="mx-auto mb-6 max-w-md text-text-secondary">
        Deals change block by block. Try a nearby zip, or widen the radius and
        we’ll keep pouring.
      </p>
      <button
        type="button"
        onClick={onTryAgain}
        className="rounded-full bg-accent px-7 py-3 font-bold text-white shadow-[0_8px_18px_-6px_rgba(217,79,43,0.55)] transition hover:-translate-y-px hover:shadow-[0_12px_22px_-6px_rgba(217,79,43,0.65)]"
      >
        Try another zip
      </button>
    </div>
  );
}
