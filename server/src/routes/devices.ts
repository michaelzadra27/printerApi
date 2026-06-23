import type { FastifyInstance } from 'fastify';
import { getSupabase } from '../supabase.js';
import { env, supabaseConfigured } from '../env.js';
import type { ParsedDevice, ParsedSupply } from '../parser/types.js';

interface SavePayload {
  device: ParsedDevice;
  supplies: ParsedSupply[];
  attributes: Record<string, Record<string, string>>;
  rawText?: string;
  confidence?: number;
  imageBase64?: string; // optional data URL or bare base64
  overwrite?: boolean; // set true to update an existing (manufacturer, model)
}

// Map the parser's camelCase device to snake_case DB columns.
function toRow(d: ParsedDevice, manufacturerId: string | null, extra: Record<string, unknown>) {
  return {
    manufacturer_id: manufacturerId,
    model: d.model,
    full_name: d.fullName,
    device_class: d.deviceClass,
    color_capability: d.colorCapability,
    technology: d.technology,
    part_number: d.partNumber,
    street_price: d.streetPrice,
    srp_price: d.srpPrice,
    intro_date: d.introDate,
    manufacturing_status: d.manufacturingStatus,
    manufacturing_status_raw: d.manufacturingStatusRaw,
    speed_ppm_black: d.speedPpmBlack,
    speed_ppm_color: d.speedPpmColor,
    speed_raw: d.speedRaw,
    first_copy_out_sec: d.firstCopyOutSec,
    first_copy_out_raw: d.firstCopyOutRaw,
    scan_speed_ipm: d.scanSpeedIpm,
    scan_speed_raw: d.scanSpeedRaw,
    fax_capable: d.faxCapable,
    fax_raw: d.faxRaw,
    has_ethernet: d.hasEthernet,
    has_wifi: d.hasWifi,
    has_nfc: d.hasNfc,
    network_interface_raw: d.networkInterfaceRaw,
    max_paper_size: d.maxPaperSize,
    ...extra,
  };
}

async function upsertManufacturer(name: string | null): Promise<string | null> {
  if (!name) return null;
  const sb = getSupabase();
  const { data: found } = await sb.from('manufacturers').select('id').eq('name', name).maybeSingle();
  if (found) return found.id;
  const { data: created, error } = await sb
    .from('manufacturers')
    .insert({ name })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

async function uploadImage(imageBase64: string, model: string): Promise<string> {
  const sb = getSupabase();
  const match = imageBase64.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i);
  const contentType = match ? match[1] : 'image/png';
  const data = match ? match[2] : imageBase64;
  const ext = contentType.split('/')[1]?.split('+')[0] ?? 'png';
  const path = `${model.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(data, 'base64');
  const { error } = await sb.storage.from(env.imageBucket).upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

async function replaceSupplies(deviceId: string, supplies: ParsedSupply[]): Promise<void> {
  const sb = getSupabase();
  await sb.from('device_supplies').delete().eq('device_id', deviceId);
  if (supplies.length === 0) return;
  const rows = supplies.map((s) => ({
    device_id: deviceId,
    description: s.description,
    part_number: s.partNumber,
    color: s.color,
    yield_pages: s.yieldPages,
    price: s.price,
    coverage: s.coverage,
    supply_type: s.supplyType,
    raw_line: s.rawLine,
  }));
  const { error } = await sb.from('device_supplies').insert(rows);
  if (error) throw error;
}

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  // Duplicate check used by the review screen before saving.
  app.get<{ Querystring: { manufacturer?: string; model?: string } }>(
    '/api/devices/check',
    async (req, reply) => {
      if (!supabaseConfigured) return reply.code(503).send({ error: 'Supabase not configured.' });
      const { manufacturer, model } = req.query;
      if (!model) return reply.code(400).send({ error: 'model is required.' });
      const sb = getSupabase();
      const { data: mfr } = manufacturer
        ? await sb.from('manufacturers').select('id').eq('name', manufacturer).maybeSingle()
        : { data: null };
      let q = sb.from('devices').select('id, model, full_name, updated_at').eq('model', model);
      q = mfr ? q.eq('manufacturer_id', mfr.id) : q.is('manufacturer_id', null);
      const { data } = await q.maybeSingle();
      return { exists: Boolean(data), device: data ?? null };
    },
  );

  app.post<{ Body: SavePayload }>('/api/devices', async (req, reply) => {
    if (!supabaseConfigured) {
      return reply.code(503).send({ error: 'Supabase not configured. Add keys to .env to save.' });
    }
    const body = req.body;
    if (!body?.device?.model) {
      return reply.code(400).send({ error: 'device.model is required.' });
    }

    try {
      const sb = getSupabase();
      const manufacturerId = await upsertManufacturer(body.device.manufacturer);

      // Duplicate detection.
      let existsQ = sb.from('devices').select('id').eq('model', body.device.model);
      existsQ = manufacturerId ? existsQ.eq('manufacturer_id', manufacturerId) : existsQ.is('manufacturer_id', null);
      const { data: existing } = await existsQ.maybeSingle();

      if (existing && !body.overwrite) {
        return reply.code(409).send({
          error: 'duplicate',
          message: 'A device with this manufacturer and model already exists.',
          existingId: existing.id,
        });
      }

      const extra: Record<string, unknown> = {
        attributes: body.attributes ?? {},
        raw_text: body.rawText ?? null,
        parse_confidence: body.confidence ?? null,
      };
      if (body.imageBase64) {
        extra.image_path = await uploadImage(body.imageBase64, body.device.model);
      }

      let deviceId: string;
      if (existing) {
        const { error } = await sb.from('devices').update(toRow(body.device, manufacturerId, extra)).eq('id', existing.id);
        if (error) throw error;
        deviceId = existing.id;
      } else {
        const { data, error } = await sb
          .from('devices')
          .insert(toRow(body.device, manufacturerId, extra))
          .select('id')
          .single();
        if (error) throw error;
        deviceId = data.id;
      }

      await replaceSupplies(deviceId, body.supplies ?? []);
      return reply.code(existing ? 200 : 201).send({ id: deviceId, updated: Boolean(existing) });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: (err as Error).message });
    }
  });
}
