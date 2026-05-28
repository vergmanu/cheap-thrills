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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
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
            placeholder="Enter zip code"
            aria-label="Zip code"
            aria-invalid={error ? true : undefined}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-lg text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {error && (
            <p className="mt-2 text-sm text-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-accent px-6 py-3 font-semibold text-bg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
        >
          Find Deals
        </button>
      </div>
    </form>
  );
}
