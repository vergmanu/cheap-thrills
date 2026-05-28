import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { DealTypeFilter, SortOption, Venue } from '../types/venue';

export type AppView =
  | 'landing'
  | 'loading'
  | 'results'
  | 'empty'
  | 'error';

export interface AppState {
  view: AppView;
  searchZip: string;
  dealFilter: DealTypeFilter;
  activeOnly: boolean;
  sortBy: SortOption;
  selectedVenue: Venue | null;
  dismissedError: boolean;
}

export type AppAction =
  | { type: 'SET_SEARCH_ZIP'; zip: string }
  | { type: 'START_SEARCH' }
  | { type: 'SEARCH_SUCCESS'; hasResults: boolean }
  | { type: 'SEARCH_ERROR' }
  | { type: 'RESET_TO_LANDING' }
  | { type: 'SET_DEAL_FILTER'; filter: DealTypeFilter }
  | { type: 'SET_ACTIVE_ONLY'; activeOnly: boolean }
  | { type: 'SET_SORT_BY'; sortBy: SortOption }
  | { type: 'SELECT_VENUE'; venue: Venue }
  | { type: 'CLOSE_VENUE_DETAIL' }
  | { type: 'DISMISS_ERROR' }
  | { type: 'SHOW_ERROR' };

const initialState: AppState = {
  view: 'landing',
  searchZip: '',
  dealFilter: 'all',
  activeOnly: false,
  sortBy: 'distance',
  selectedVenue: null,
  dismissedError: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SEARCH_ZIP':
      return { ...state, searchZip: action.zip };
    case 'START_SEARCH':
      return {
        ...state,
        view: 'loading',
        dismissedError: false,
        selectedVenue: null,
      };
    case 'SEARCH_SUCCESS':
      return {
        ...state,
        view: action.hasResults ? 'results' : 'empty',
      };
    case 'SEARCH_ERROR':
      return { ...state, view: 'error', dismissedError: false };
    case 'RESET_TO_LANDING':
      return {
        ...initialState,
        dealFilter: state.dealFilter,
        activeOnly: state.activeOnly,
        sortBy: state.sortBy,
      };
    case 'SET_DEAL_FILTER':
      return { ...state, dealFilter: action.filter };
    case 'SET_ACTIVE_ONLY':
      return { ...state, activeOnly: action.activeOnly };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.sortBy };
    case 'SELECT_VENUE':
      return { ...state, selectedVenue: action.venue };
    case 'CLOSE_VENUE_DETAIL':
      return { ...state, selectedVenue: null };
    case 'DISMISS_ERROR':
      return { ...state, dismissedError: true };
    case 'SHOW_ERROR':
      return { ...state, dismissedError: false };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
