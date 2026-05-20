import { randomBytes } from "crypto";

export const FNC1 = String.fromCharCode(232);

function checkDigit(digits: string): number {
  let sum = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    const d = parseInt(reversed[i]!, 10);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidGtin(gtin: string): boolean {
  if (!/^\d{13,14}$/.test(gtin)) return false;
  const padded = gtin.length === 13 ? "0" + gtin : gtin;
  const body = padded.slice(0, 13);
  const cd = parseInt(padded.slice(13), 10);
  return checkDigit(body) === cd;
}

function pad(value: number | string, len: number): string {
  return String(value).padStart(len, "0");
}

function formatExpiry(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const yy = String(date.getUTCFullYear() % 100).padStart(2, "0");
  const mm = pad(date.getUTCMonth() + 1, 2);
  const dd = pad(date.getUTCDate(), 2);
  return `${yy}${mm}${dd}`;
}

function makeSerial(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let serial = "";
  for (let i = 0; i < 9; i++) {
    const r = randomBytes(1)[0]! % chars.length;
    serial += chars[r];
  }
  return serial;
}

function makeRandomDigits(count: number): string {
  let out = "";
  while (out.length < count) {
    const buf = randomBytes(count);
    for (let i = 0; i < buf.length && out.length < count; i++) {
      const v = buf[i]!;
      if (v < 250) out += (v % 10).toString();
    }
  }
  return out;
}

export interface UnitCodeInput {
  gtin: string;
  expiry: Date | string;
  batch: string;
}

export function generateUnitCode(input: UnitCodeInput): {
  raw: string;
  serial: string;
} {
  const padded = input.gtin.length === 13 ? "0" + input.gtin : input.gtin;
  const expiry = formatExpiry(input.expiry);
  const serial = makeSerial();
  const raw = `01${padded}17${expiry}10${input.batch}${FNC1}21${serial}`;
  return { raw, serial };
}

// SSCC = AI(00) + 1 extension digit + 7 digit company prefix + 9 digit serial reference + check digit
// We pack the company prefix with the GTIN's middle digits and produce a unique 18-digit SSCC.
export function generateSsccCode(companyPrefix: string, _seq: number): {
  raw: string;
  sscc: string;
} {
  const ext = "1";
  const prefix = companyPrefix.padStart(7, "0").slice(0, 7);
  const serialRef = makeRandomDigits(9);
  const body = ext + prefix + serialRef;
  const cd = checkDigit(body);
  const sscc = body + cd.toString();
  const raw = `00${sscc}`;
  return { raw, sscc };
}
