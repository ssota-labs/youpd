import {
  CreativeTemplateSlotSchemaJson,
  type CreativeTemplateSlot,
} from '@youpd/types';
import type { ThumbnailSlotValues } from '@youpd/types';

export type SlotValidationResult =
  | { ok: true }
  | { ok: false; message: string; slotKey?: string };

function valueForSlot(
  slot: CreativeTemplateSlot,
  values: Record<string, string | number>,
): string | number | undefined {
  return values[slot.key];
}

function isEmpty(value: string | number | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

export function validateSlotValuesAgainstSchema(
  slotSchema: unknown,
  slotValues: ThumbnailSlotValues,
): SlotValidationResult {
  const parsed = CreativeTemplateSlotSchemaJson.safeParse(slotSchema);
  if (!parsed.success) {
    return { ok: false, message: 'Invalid template slot schema' };
  }

  const { values } = slotValues;
  for (const slot of parsed.data.slots) {
    const raw = valueForSlot(slot, values);
    if (slot.required && isEmpty(raw)) {
      return {
        ok: false,
        message: `Required slot "${slot.label}" is empty`,
        slotKey: slot.key,
      };
    }
    if (raw === undefined) continue;

    if (slot.type === 'number') {
      const num = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isNaN(num)) {
        return {
          ok: false,
          message: `Slot "${slot.label}" must be a number`,
          slotKey: slot.key,
        };
      }
      values[slot.key] = num;
      continue;
    }

    const text = typeof raw === 'string' ? raw.trim() : String(raw);
    if (slot.type === 'text' || slot.type === 'person' || slot.type === 'chart_data') {
      values[slot.key] = text;
      continue;
    }

    values[slot.key] = text;
  }

  return { ok: true };
}
