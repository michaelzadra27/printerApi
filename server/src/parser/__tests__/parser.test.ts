import { describe, it, expect } from 'vitest';
import { parseDevice } from '../index.js';
import { M479FDN_SAMPLE } from './m479fdn.sample.js';
import { M404DN_SAMPLE } from './m404dn.sample.js';
import { C360I_SAMPLE } from './c360i.sample.js';

describe('parseDevice — HP M479fdn BLI sample', () => {
  const result = parseDevice(M479FDN_SAMPLE);
  const d = result.device;

  it('parses identity from the header', () => {
    expect(d.manufacturer).toBe('HP');
    expect(d.model).toBe('Color LaserJet Pro MFP M479fdn');
    expect(d.fullName).toBe('HP Color LaserJet Pro MFP M479fdn');
    expect(d.deviceClass).toBe('mfp');
    expect(d.colorCapability).toBe('color');
    expect(d.technology).toBe('laser');
  });

  it('strips UI chrome / junk lines', () => {
    // rawText intentionally retains the original paste for provenance; check parsed output only.
    const { rawText, ...parsed } = result;
    const flat = JSON.stringify(parsed).toLowerCase();
    expect(flat).not.toContain('export xls');
    expect(flat).not.toContain('specification guide');
    expect(flat).not.toContain('my spec view');
    expect(flat).not.toContain('columnar format');
  });

  it('extracts SKU, pricing and lifecycle', () => {
    expect(d.partNumber).toBe('W1A79A');
    expect(d.streetPrice).toBe(819);
    expect(d.srpPrice).toBeNull(); // "$ not avail"
    expect(d.introDate).toBe('May 2019');
    expect(d.manufacturingStatus).toBe('discontinued');
  });

  it('parses performance numbers (raw + parsed)', () => {
    expect(d.speedPpm).toBe(28); // single headline value, max of black/color
    expect(d.firstCopyOutSec).toBe(9.5); // prefers black
  });

  it('captures scan speed as simplex AND duplex (color + black)', () => {
    expect(d.scanSpeedSimplexColor).toBe(20);
    expect(d.scanSpeedSimplexBlack).toBe(29);
    expect(d.scanSpeedDuplexColor).toBe(34);
    expect(d.scanSpeedDuplexBlack).toBe(46);
  });

  it('derives feeder type from the Document Feeder field (DSPF = single-pass)', () => {
    // "Std DSPF" is single-pass even though duplex (46) is only 1.59x simplex (29),
    // so the named-feeder signal must win over the speed ratio.
    expect(d.documentFeeder).toBe('Std DSPF');
    expect(d.scannerFeederType).toBe('single-pass');
  });

  it('elevates capability fields (fax / network / wifi)', () => {
    expect(d.faxCapable).toBe(true);
    expect(d.hasEthernet).toBe(true);
    expect(d.hasWifi).toBeNull(); // M479fdn is ethernet-only
    expect(d.hasNfc).toBe(false);
    expect(d.networkInterfaceRaw).toMatch(/ethernet/i);
  });

  it('handles two-column rows without clobbering keys', () => {
    expect(result.attributes.copier_features?.book_copy).toBe('No');
    expect(result.attributes.copier_features?.job_programs).toBe('No');
    expect(result.attributes.copier_features?.photo_mode).toBe('Yes');
  });

  it('captures the continued-on-next-line "Other:" value', () => {
    expect(result.attributes.paper_handling?.other).toMatch(/550-sheet tray/);
  });

  it('namespaces repeated keys by section', () => {
    expect(result.attributes.scanner?.technology).toBe('CIS');
    expect(result.attributes.security?.snmpv3).toBe('Yes');
    expect(result.attributes.fax?.modem_speed).toBe('33.6 Kbps');
  });

  it('drops null sentinels from attributes', () => {
    expect(result.attributes.security?.ipsec).toBeUndefined();
    expect(result.attributes.security?.mac_address_filtering).toBeUndefined();
  });

  it('parses sellable supplies only (no starters, no options, no PM)', () => {
    expect(result.supplies).toHaveLength(8); // 8 priced HP 414 cartridges
    const partNumbers = result.supplies.map((s) => s.partNumber);
    expect(partNumbers).toContain('W2020x');
    expect(result.supplies.every((s) => s.price !== null)).toBe(true);
    expect(result.supplies.some((s) => /starter/i.test(s.description))).toBe(false);
    expect(result.supplies.some((s) => /usb drive/i.test(s.description))).toBe(false);
  });

  it('structures a supply row correctly', () => {
    const x = result.supplies.find((s) => s.partNumber === 'W2020x')!;
    expect(x.color).toBe('black');
    expect(x.price).toBe(235.99);
    expect(x.yieldPages).toBe(7500);
    expect(x.coverage).toBe('ISO/IEC 19798');
    expect(x.supplyType).toBe('cartridge');
  });

  it('takes the higher value when black and color speeds differ', () => {
    const r = parseDevice('HP OfficeJet Pro 8720\nMFP\nPrinter Specs\nSpeed:\t20 ppm color/24 ppm black');
    expect(r.device.speedPpm).toBe(24);
  });

  it('reports high confidence on a complete sheet', () => {
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe('parseDevice — HP M404dn single-function printer (different template)', () => {
  const result = parseDevice(M404DN_SAMPLE);
  const d = result.device;

  it('parses identity incl. monochrome from the mashed header line', () => {
    expect(d.manufacturer).toBe('HP');
    expect(d.model).toBe('LaserJet Pro M404dn');
    expect(d.deviceClass).toBe('printer');
    expect(d.colorCapability).toBe('mono');
    expect(d.technology).toBe('laser');
    expect(d.speedPpm).toBe(40); // from "Printer • 40 ppm"
  });

  it('handles parenthetical label variants', () => {
    expect(d.firstCopyOutSec).toBe(6.1); // "First-Page-Out Time (Mono/Color)"
    expect(d.maxPaperSize).toBe('8.5" x 14" max'); // "Paper Size (WxL)"
  });

  it('reads the printer-template network label and Ethernet flag', () => {
    expect(d.networkInterfaceRaw).toMatch(/ethernet/i); // "Std Interface"
    expect(d.hasEthernet).toBe(true);
    expect(d.hasWifi).toBeNull();
  });

  it('records fax as absent for a single-function printer', () => {
    expect(d.faxCapable).toBe(false);
  });

  it('parses the bare "Supplies" section (sellable only)', () => {
    expect(result.supplies).toHaveLength(2); // 2 priced; starter dropped
    expect(result.supplies.map((s) => s.partNumber)).toEqual(['CF258A', 'CF258X']);
    expect(result.supplies.every((s) => s.color === 'black')).toBe(true);
  });

  it('captures SKU/pricing/lifecycle', () => {
    expect(d.partNumber).toBe('W1A53A');
    expect(d.streetPrice).toBe(369);
    expect(d.srpPrice).toBeNull(); // "INA/$369"
    expect(d.manufacturingStatus).toBe('discontinued');
  });
});

describe('parseDevice — Konica Minolta C360i A3 copier', () => {
  const result = parseDevice(C360I_SAMPLE);
  const d = result.device;

  it('parses identity and classifies as A3 from the header line', () => {
    expect(d.manufacturer).toBe('Konica Minolta');
    expect(d.model).toBe('bizhub C360i');
    expect(d.deviceClass).toBe('copier');
    expect(d.colorCapability).toBe('color');
    expect(d.paperSizeClass).toBe('A3');
    expect(d.maxPaperSize).toBe('11 x 17');
  });

  it('skips supplies entirely on A3 (no MPS takeover on A3)', () => {
    expect(result.supplies).toHaveLength(0);
  });

  it('keeps fax (optional) for a multifunction copier', () => {
    expect(d.faxCapable).toBe(true); // "Fax: Opt"
    expect(d.faxRaw).toBe('Opt');
  });

  it('reads connectivity incl. optional wireless', () => {
    expect(d.hasEthernet).toBe(true);
    expect(d.hasWifi).toBe(true); // "opt wireless" / 802.11
    expect(d.hasNfc).toBe(true);
  });

  it('derives single-pass feeder and full scan speeds', () => {
    expect(d.scannerFeederType).toBe('single-pass');
    expect(d.scanSpeedSimplexBlack).toBe(100);
    expect(d.scanSpeedDuplexBlack).toBe(200);
  });

  it('parses SRP correctly ($19,482 SRP / no street)', () => {
    expect(d.srpPrice).toBe(19482);
    expect(d.streetPrice).toBeNull();
    expect(d.manufacturingStatus).toBe('active');
  });
});

// A4 devices must still classify as A4 (regression guard).
describe('paperSizeClass regression — A4 devices', () => {
  it('classifies the M404dn printer as A4', () => {
    expect(parseDevice(M404DN_SAMPLE).device.paperSizeClass).toBe('A4');
  });
  it('classifies the M479fdn MFP as A4', () => {
    expect(parseDevice(M479FDN_SAMPLE).device.paperSizeClass).toBe('A4');
  });
});
