// Numeric / unit extractors. Each keeps the device "raw + parsed" contract:
// callers store both the original string and the parsed number.

import { isSentinel } from './dictionary.js';

// "50,000 impressions" -> 50000 ; "$819" -> 819 ; handles commas.
export function firstNumber(value: string): number | null {
  if (isSentinel(value)) return null;
  const m = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// All numbers in a string, comma-stripped.
export function allNumbers(value: string): number[] {
  return (value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

// "$ not avail/$819"  -> { srp: null, street: 819 }
// "$129/$99"          -> { srp: 129, street: 99 }
export function parsePriceePair(value: string): { srp: number | null; street: number | null } {
  const parts = value.split('/');
  const grab = (p: string | undefined): number | null => {
    if (!p) return null;
    const m = p.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  };
  return { srp: grab(parts[0]), street: grab(parts[1] ?? parts[0]) };
}

// "$235.99" -> 235.99
export function parseMoney(value: string): number | null {
  const m = value.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

// "28 ppm color/28 ppm black" -> { color: 28, black: 28 }
// "24 ppm black" -> { color: null, black: 24 }
export function parseSpeed(value: string): { color: number | null; black: number | null } {
  let color: number | null = null;
  let black: number | null = null;
  for (const seg of value.split('/')) {
    const n = firstNumber(seg);
    if (n === null) continue;
    if (/colou?r/i.test(seg)) color = n;
    else if (/black|mono|b\/?w/i.test(seg)) black = n;
    else if (black === null) black = n; // bare number defaults to black/mono
  }
  return { color, black };
}

// "11.1 sec color/9.5 sec black" -> 9.5 (prefer black, else first)
export function parseFirstCopyOut(value: string): number | null {
  const { color, black } = parseSpeed(value);
  if (black !== null) return black;
  if (color !== null) return color;
  return firstNumber(value);
}

export interface ScanSpeed {
  simplexColor: number | null;
  simplexBlack: number | null;
  duplexColor: number | null;
  duplexBlack: number | null;
}

// "20 ipm color, 29 ipm black/34 ipm color, 46 ipm black"
//   -> simplex {color:20, black:29}, duplex {color:34, black:46}
// The BLI label is "Scan Speed (Simplex/Duplex)": '/' separates the two sides,
// ',' separates color/black within a side. A single side (no '/') is simplex.
export function parseScanSpeed(value: string): ScanSpeed {
  const sides = value.split('/');
  const parseSide = (s: string): { color: number | null; black: number | null } => {
    let color: number | null = null;
    let black: number | null = null;
    for (const seg of s.split(',')) {
      const n = firstNumber(seg);
      if (n === null) continue;
      if (/colou?r/i.test(seg)) color = n;
      else if (/black|mono/i.test(seg)) black = n;
      else if (black === null) black = n; // bare number defaults to black/mono
    }
    return { color, black };
  };
  const simplex = parseSide(sides[0] ?? '');
  const duplex = sides[1] ? parseSide(sides[1]) : { color: null, black: null };
  return {
    simplexColor: simplex.color,
    simplexBlack: simplex.black,
    duplexColor: duplex.color,
    duplexBlack: duplex.black,
  };
}

// Duplex single-pass feeders capture both sides per pass (≈2× simplex ipm);
// reversing feeders re-feed each sheet. Prefer the explicitly named feeder
// type; fall back to the speed ratio only when the feeder type is unstated.
const SINGLE_PASS_RATIO = 1.8;

export function deriveFeederType(
  documentFeeder: string | null,
  scan: ScanSpeed,
): string | null {
  const f = (documentFeeder ?? '').toLowerCase();
  if (/single.?pass|dspf|dsdf|dual.?scan/.test(f)) return 'single-pass';
  if (/revers|radf|ardf|rspf/.test(f)) return 'reversing';

  const simplex = scan.simplexBlack ?? scan.simplexColor;
  const duplex = scan.duplexBlack ?? scan.duplexColor;
  if (simplex && duplex && simplex > 0) {
    return duplex / simplex >= SINGLE_PASS_RATIO ? 'single-pass' : 'reversing';
  }
  return null;
}

// "Discontinued (07/2023)" -> { status: 'discontinued', raw }
// "Active" / "Current"     -> { status: 'active', raw }
export function parseStatus(value: string): { status: string | null; raw: string } {
  const raw = value.trim();
  if (/discontinu/i.test(raw)) return { status: 'discontinued', raw };
  if (/active|current|available|shipping/i.test(raw)) return { status: 'active', raw };
  return { status: isSentinel(raw) ? null : raw.toLowerCase(), raw };
}

// Yes/Std/Standard -> true ; No/Opt only when explicit ; sentinels -> null
export function parseCapability(value: string): boolean | null {
  if (isSentinel(value)) return null;
  const v = value.trim().toLowerCase();
  if (/^(yes|std|standard)\b/.test(v)) return true;
  if (/^(opt|optional)\b/.test(v)) return true; // capability exists, even if optional
  if (/^no\b/.test(v)) return false;
  return null;
}
