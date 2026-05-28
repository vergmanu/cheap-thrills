export function isValidZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}
