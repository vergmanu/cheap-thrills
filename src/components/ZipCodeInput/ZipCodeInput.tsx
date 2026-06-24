import { FormEvent, useState } from 'react';
import { isValidZipCode } from '../../utils/zipValidation';

interface ZipCodeInputProps {
  initialValue?: string;
  onSubmit: (zip: string) => void;
}

export function ZipCodeInput({ initialValue = '', onSubmit }: ZipCodeInputProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();

    if (!isValidZipCode(trimmed)) {
      setError('Enter a valid 5-digit US zip code');
      return;
    }

    setError(null);
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div
        className={[
          'flex items-center gap-2 rounded-full border bg-surface pl-6 pr-1.5 py-1.5',
          'shadow-glow transition duration-300',
          'hover:-translate-y-px focus-within:-translate-y-0.5 focus-within:shadow-glow-lg',
          error ? 'border-error' : 'border-accent-muted focus-within:border-accent',
        ].join(' ')}
      >
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={value}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, '').slice(0, 5);
            setValue(next);
            if (error) setError(null);
          }}
          placeholder="Enter your zip code"
          aria-label="Zip code"
          aria-invalid={error ? true : undefined}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-lg text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-accent px-6 py-3 font-bold text-white shadow-[0_8px_18px_-6px_rgba(217,79,43,0.55)] transition hover:-translate-y-px hover:-rotate-1 hover:shadow-[0_12px_22px_-6px_rgba(217,79,43,0.65)] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
        >
          Find Deals →
        </button>
      </div>
      {error && (
        <p className="mt-2 text-center text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
