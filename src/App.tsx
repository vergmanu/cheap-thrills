import { useEffect, useMemo, useRef } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ZipCodeInput } from './components/ZipCodeInput';
import { FilterBar } from './components/FilterBar';
import { ResultsGrid } from './components/ResultsGrid';
import { LoadingState } from './components/LoadingState';
import { EmptyState } from './components/EmptyState';
import { VenueDetail } from './components/VenueDetail';
import { useZipCode } from './hooks/useZipCode';
import { useHappyHours } from './hooks/useHappyHours';
import { filterAndSortVenues } from './utils/filterSort';

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
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
          <p className="font-display italic text-sm text-text-secondary mb-2 tracking-wide">
            Your neighborhood guide to
          </p>
        <h1 className="font-display text-5xl font-bold text-text-primary mb-2">
          Cheap Thrills
        </h1>
          <p className="font-display italic text-base text-text-secondary mb-8">
          Happy Hour Finder
        </p>
          <ZipCodeInput initialValue={zipCode} onSubmit={handleSearch} />
        </main>
      )}

      {state.view !== 'landing' && (
        <main className="mx-auto max-w-5xl px-4 py-8">
          <header className="mb-8">
            <h1 className="font-display text-3xl font-bold text-text-primary">
              Cheap Thrills
            </h1>
            <p className="text-text-secondary">Happy hours near {state.searchZip}</p>
          </header>

          {(state.view === 'results' || state.view === 'empty') && (
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
              />
            </div>
          )}

          {state.view === 'loading' && <LoadingState />}

          {state.view === 'empty' && (
            <EmptyState zipCode={state.searchZip} onTryAgain={() => refetch()} />
          )}

          {state.view === 'results' && (
            <ResultsGrid
              venues={filteredVenues}
              zipCode={state.searchZip}
              onVenueClick={(venue) =>
                dispatch({ type: 'SELECT_VENUE', venue })
              }
              onEditZip={handleEditZip}
            />
          )}

          {state.view === 'error' && !isLoading && venues.length > 0 && (
            <ResultsGrid
              venues={filteredVenues}
              zipCode={state.searchZip}
              onVenueClick={(venue) =>
                dispatch({ type: 'SELECT_VENUE', venue })
              }
              onEditZip={handleEditZip}
            />
          )}
        </main>
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
