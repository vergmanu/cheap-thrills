import { useCallback, useState } from 'react';

const STORAGE_KEY = 'cheapThrills_zipCode';

function readStoredZip(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function useZipCode() {
  const [zipCode, setZipCodeState] = useState<string>(readStoredZip);

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
