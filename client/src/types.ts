// Mirror of the server parser contract (server/src/parser/types.ts).

export type DeviceClass =
  | 'printer'
  | 'mfp'
  | 'copier'
  | 'scanner'
  | 'production'
  | 'fax'
  | 'unknown';

export interface ParsedSupply {
  description: string;
  partNumber: string | null;
  color: string | null;
  yieldPages: number | null;
  price: number | null;
  coverage: string | null;
  supplyType: string | null;
  rawLine: string;
}

export interface ParsedDevice {
  manufacturer: string | null;
  model: string | null;
  fullName: string | null;
  deviceClass: DeviceClass;
  colorCapability: string | null;
  technology: string | null;
  partNumber: string | null;
  streetPrice: number | null;
  srpPrice: number | null;
  introDate: string | null;
  manufacturingStatus: string | null;
  manufacturingStatusRaw: string | null;
  speedPpm: number | null;
  speedRaw: string | null;
  firstCopyOutSec: number | null;
  firstCopyOutRaw: string | null;
  scanSpeedSimplexBlack: number | null;
  scanSpeedSimplexColor: number | null;
  scanSpeedDuplexBlack: number | null;
  scanSpeedDuplexColor: number | null;
  scanSpeedRaw: string | null;
  documentFeeder: string | null;
  scannerFeederType: string | null;
  faxCapable: boolean | null;
  faxRaw: string | null;
  hasEthernet: boolean | null;
  hasWifi: boolean | null;
  hasNfc: boolean | null;
  networkInterfaceRaw: string | null;
  maxPaperSize: string | null;
}

export interface ParseResult {
  device: ParsedDevice;
  supplies: ParsedSupply[];
  attributes: Record<string, Record<string, string>>;
  confidence: number;
  unmappedKeys: string[];
  rawText: string;
}
