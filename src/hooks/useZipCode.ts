import { useCallback, useState } from 'react';

const STORAGE_KEY = 'cheapThrills_zipCode';

function readInitialZip(): string {
  // Check URL param first — deep link takes priority
  try {
    const params = new URLSearchParams(window.location.search);
    const zipFromUrl = params.get('zip');
    if (zipFromUrl && /^\d{5}$/.test(zipFromUrl)) {
      return zipFromUrl;
    }
  } catch {
    // window not available
  }

  // Fall back to localStorage
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function useZipCode() {
  const [zipCode, setZipCodeState] = useState<string>(readInitialZip);

  const setZipCode = useCallback((value: string) => {
    setZipCodeState(value);
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, value);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const clearZipCode = useCallback(() => {
    setZipCode('');
  }, [setZipCode]);

  return { zipCode, setZipCode, clearZipCode };
}