import { useCallback, useEffect, useRef, useState } from 'react';
import type { Venue } from '../types/venue';
import { createHappyHourService } from '../services/happyHourService';
import { isHappyHourActive } from '../utils/timeUtils';
import { ApiError } from '../services/apiClient';

const FETCH_TIMEOUT_MS = 8000;

function enrichVenues(venues: Venue[]): Venue[] {
  return venues.map((venue) => ({
    ...venue,
    isActiveNow: isHappyHourActive(venue.happyHours),
  }));
}

export function useHappyHours(zipCode: string) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const serviceRef = useRef(createHappyHourService());

  const fetchVenues = useCallback(async (signal: AbortSignal) => {
    const service = serviceRef.current;
    const radiusMiles = Number(import.meta.env.VITE_SEARCH_RADIUS_MILES) || 5;
    const raw = await service.getVenues(
      { zipCode, radiusMiles },
      { signal },
    );
    return enrichVenues(raw);
  }, [zipCode]);

  const runFetch = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    setIsLoading(true);
    setError(null);

    fetchVenues(controller.signal)
      .then((data) => {
        setVenues(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
          return;
        }
        if (err instanceof ApiError && err.status === 429) {
          setError(err.message);
          return;
        }
        if (err instanceof Error) {
          setError(err.message);
          return;
        }
        setError('Something went wrong. Please try again.');
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setIsLoading(false);
      });
  }, [fetchVenues]);

  useEffect(() => {
    if (!zipCode) {
      setVenues([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Set loading synchronously so parent effects don't treat idle as "fetch done"
    setIsLoading(true);
    setError(null);
    runFetch();

    return () => {
      abortRef.current?.abort();
    };
  }, [zipCode, runFetch]);

  const refetch = useCallback(() => {
    if (!zipCode) return;
    runFetch();
  }, [zipCode, runFetch]);

  return { venues, isLoading, error, refetch };
}
