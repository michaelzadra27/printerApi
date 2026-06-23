// Parses the "Supplies/Maintenance" block into structured SKUs.
// Per product owner: SELLABLE supplies only — lines without a price
// (starter/in-box cartridges, "PM Schedule", maintenance notes) are dropped.

import type { ParsedSupply } from './types.js';
import { parseMoney, firstNumber } from './values.js';

function detectColor(desc: string): string | null {
  const d = desc.toLowerCase();
  if (/\btri-?color\b/.test(d)) return 'tri-color';
  if (/\bblack\b/.test(d)) return 'black';
  if (/\bcyan\b/.test(d)) return 'cyan';
  if (/\bmagenta\b/.test(d)) return 'magenta';
  if (/\byellow\b/.test(d)) return 'yellow';
  if (/\bcolou?r\b/.test(d)) return 'color';
  return null;
}

function detectType(desc: string): string | null {
  const d = desc.toLowerCase();
  if (/\bdrum\b/.test(d)) return 'drum';
  if (/\btoner\b/.test(d)) return 'toner';
  if (/\bink\b/.test(d)) return 'ink';
  if (/maintenance|waste|fuser|transfer/i.test(d)) return 'maintenance';
  if (/cartridge/i.test(d)) return 'cartridge';
  return null;
}

export function parseSupplyLine(line: string): ParsedSupply | null {
  const raw = line.trim();
  if (raw === '') return null;
  if (/^pm schedule/i.test(raw)) return null;

  // Split on ';' into the main descriptor and trailing Yield/Coverage fields.
  const segments = raw.split(';').map((s) => s.trim());
  const main = segments[0] ?? '';

  // Sellable filter: there must be a price somewhere in the line.
  const price = parseMoney(raw.includes('$') ? raw.slice(raw.indexOf('$')) : '');
  if (price === null) return null;

  // Part number: last parenthesized token in the main descriptor.
  const partMatches = [...main.matchAll(/\(([^)]+)\)/g)];
  const partNumber = partMatches.length ? partMatches[partMatches.length - 1][1].trim() : null;

  // Description: strip the "(part): $price" tail from the main descriptor.
  let description = main
    .replace(/\([^)]*\)\s*:?\s*\$?\s*[\d.,]+\s*$/, '')
    .replace(/:\s*\$?\s*[\d.,]+\s*$/, '')
    .replace(/\([^)]*\)\s*$/, '')
    .trim();
  if (description === '') description = main.trim();

  let yieldPages: number | null = null;
  let coverage: string | null = null;
  for (const seg of segments.slice(1)) {
    if (/^yield/i.test(seg)) yieldPages = firstNumber(seg);
    else if (/^coverage/i.test(seg)) coverage = seg.replace(/^coverage:\s*/i, '').trim() || null;
  }

  return {
    description,
    partNumber,
    color: detectColor(main),
    yieldPages,
    price,
    coverage,
    supplyType: detectType(main),
    rawLine: raw,
  };
}

export function parseSupplies(lines: string[]): ParsedSupply[] {
  const out: ParsedSupply[] = [];
  for (const line of lines) {
    const s = parseSupplyLine(line);
    if (s) out.push(s);
  }
  return out;
}
