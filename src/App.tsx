import { useEffect, useMemo, useRef } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ZipCodeInput } from './components/ZipCodeInput';
import { FilterBar } from './components/FilterBar';
import { ResultsGrid } from './components/ResultsGrid';
import { LoadingState } from './components/LoadingState';
import { EmptyState } from './components/EmptyState';
import { VenueDetail } from './components/VenueDetail';
import { Marquee } from './components/Marquee';
import { Squiggle } from './components/Squiggle';
import { useZipCode } from './hooks/useZipCode';
import { useHappyHours } from './hooks/useHappyHours';
import { filterAndSortVenues } from './utils/filterSort';

const MARQUEE_ITEMS = [
  'Happy Hour',
  'Cheap Thrills',
  '2-for-1',
  '$5 Wine',
  'Dollar Oysters',
  'Half-off Apps',
];

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-bold ${className}`}>
      Cheap <span className="text-accent">Thrills</span>
    </span>
  );
}

function AppContent() {
  const { state, dispatch } = useAppContext();
  const { zipCode, setZipCode } = useZipCode();

  const activeSearchZip =
    state.view === 'landing' ? '' : state.searchZip;

  const { venues, isLoading, error, refetch } = useHappyHours(activeSearchZip);

  const filteredVenues = useMemo(
    () =>
      filterAndSortVenues(
        venues,
        state.dealFilter,
        state.activeOnly,
        state.sortBy,
      ),
    [venues, state.dealFilter, state.activeOnly, state.sortBy],
  );

  const fetchStartedRef = useRef(false);

  useEffect(() => {
    if (state.view === 'loading' && isLoading) {
      fetchStartedRef.current = true;
    }
  }, [state.view, isLoading]);

  useEffect(() => {
    if (state.view !== 'loading' || isLoading) return;
    if (!fetchStartedRef.current) return;

    fetchStartedRef.current = false;

    if (error) {
      dispatch({ type: 'SEARCH_ERROR' });
      return;
    }

    dispatch({
      type: 'SEARCH_SUCCESS',
      hasResults: venues.length > 0,
    });
  }, [state.view, isLoading, error, venues.length, dispatch]);

  useEffect(() => {
    if (
      (state.view === 'empty' || state.view === 'error') &&
      !isLoading &&
      !error &&
      venues.length > 0
    ) {
      dispatch({ type: 'SEARCH_SUCCESS', hasResults: true });
    }
  }, [state.view, isLoading, error, venues.length, dispatch]);

  const handleSearch = (zip: string) => {
    fetchStartedRef.current = false;
    setZipCode(zip);
    dispatch({ type: 'SET_SEARCH_ZIP', zip });
    dispatch({ type: 'START_SEARCH' });
  };

  const handleEditZip = () => {
    dispatch({ type: 'RESET_TO_LANDING' });
  };

  const handleSurprise = () => {
    if (filteredVenues.length === 0) return;
    const pick =
      filteredVenues[Math.floor(Math.random() * filteredVenues.length)];
    if (pick) dispatch({ type: 'SELECT_VENUE', venue: pick });
  };

  const showErrorBanner =
    (state.view === 'error' || error) && !state.dismissedError;

  return (
    <div className="min-h-screen">
      {showErrorBanner && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b border-error/30 bg-error/10 px-4 py-3 text-sm"
          role="alert"
        >
          <p className="text-error">
            {error ?? 'Unable to load happy hours. Please try again.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md bg-error px-3 py-1 font-medium text-white hover:brightness-110"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'DISMISS_ERROR' })}
              className="rounded-md border border-error/40 px-3 py-1 text-error hover:bg-error/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {state.view === 'landing' && (
        <>
          <Marquee items={MARQUEE_ITEMS} />
          <main className="flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center px-4 py-16 text-center">
            <p className="mb-2 font-display text-sm italic tracking-wide text-text-secondary">
              Your neighborhood guide to
            </p>
            <h1 className="mb-10 text-6xl font-bold leading-[0.92] tracking-tight sm:text-7xl">
              <Wordmark />
            </h1>
            <ZipCodeInput initialValue={zipCode} onSubmit={handleSearch} />
            <img
              src="/illustrations/spread.png"
              alt=""
              className="mt-8 w-[360px] max-w-[90%]"
            />
            <Squiggle className="mt-6 w-52 text-accent" />
          </main>
        </>
      )}

      {state.view !== 'landing' && (
        <>
          <header className="flex items-center justify-center border-b border-border px-4 py-5">
            <Wordmark className="text-2xl" />
          </header>

          <main className="mx-auto max-w-5xl px-4 py-8">
            {(state.view === 'results' ||
              (state.view === 'error' && venues.length > 0)) && (
              <>
                <h2 className="mb-6 font-display text-3xl font-bold">
                  <span className="text-accent">
                    {filteredVenues.length} happy{' '}
                    {filteredVenues.length === 1 ? 'hour' : 'hours'}
                  </span>{' '}
                  near {state.searchZip}
                  <button
                    type="button"
                    onClick={handleEditZip}
                    aria-label="Edit zip code"
                    className="ml-2 align-middle font-sans text-base font-semibold text-accent underline decoration-dotted underline-offset-4 hover:text-text-primary"
                  >
                    ✎ edit
                  </button>
                </h2>

                <div className="mb-6">
                  <FilterBar
                    dealFilter={state.dealFilter}
                    activeOnly={state.activeOnly}
                    sortBy={state.sortBy}
                    onDealFilterChange={(filter) =>
                      dispatch({ type: 'SET_DEAL_FILTER', filter })
                    }
                    onActiveOnlyChange={(activeOnly) =>
                      dispatch({ type: 'SET_ACTIVE_ONLY', activeOnly })
                    }
                    onSortChange={(sortBy) =>
                      dispatch({ type: 'SET_SORT_BY', sortBy })
                    }
                    onSurprise={handleSurprise}
                  />
                </div>

                <ResultsGrid
                  venues={filteredVenues}
                  onVenueClick={(venue) =>
                    dispatch({ type: 'SELECT_VENUE', venue })
                  }
                />
              </>
            )}

            {state.view === 'loading' && <LoadingState />}

            {state.view === 'empty' && (
              <EmptyState zipCode={state.searchZip} onTryAgain={handleEditZip} />
            )}
          </main>
        </>
      )}

      {state.selectedVenue && (
        <VenueDetail
          venue={state.selectedVenue}
          onClose={() => dispatch({ type: 'CLOSE_VENUE_DETAIL' })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
