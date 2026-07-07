/**
 * Validates a GS1 barcode check-digit (modulo-10 algorithm)
 * Supports GTIN-8, GTIN-12, GTIN-13, GTIN-14, GLN-13, and SSCC-18
 */
export function validateGs1CheckDigit(code: string): boolean {
  if (!code || !/^\d+$/.test(code)) {
    return false;
  }

  const digits = code.split("").map(Number);
  if (digits.length < 8 || digits.length > 18) {
    return false;
  }

  const expectedCheckDigit = digits[digits.length - 1];

  let sum = 0;
  // Position count from right to left starts at 2 (excluding the check digit at position 1)
  // Even positions from the right are multiplied by 3
  // Odd positions from the right are multiplied by 1
  let multiplier = 3;
  for (let i = digits.length - 2; i >= 0; i--) {
    sum += digits[i] * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return calculatedCheckDigit === expectedCheckDigit;
}
