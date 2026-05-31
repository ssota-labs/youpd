'use client';

import { useMemo, useState } from 'react';
import type { CopyTemplateDetail } from '@youpd/types';
import { Button } from '@youpd/ui/components/ui/button';
import { Input } from '@youpd/ui/components/ui/input';
import { Label } from '@youpd/ui/components/ui/label';

type FillSlotsFormProps = {
  template: CopyTemplateDetail;
};

export function FillSlotsForm({ template }: FillSlotsFormProps) {
  const initialValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const slot of template.slotSchema.slots) {
      values[slot.key] = '';
    }
    return values;
  }, [template.slotSchema.slots]);

  const [slotValues, setSlotValues] = useState(initialValues);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFill(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/copy-templates/${template.id}/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotValues }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? '채우기에 실패했습니다.');
        setPreview(null);
        return;
      }
      setPreview(data.filledTitle);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function copyPreview() {
    if (!preview) return;
    await navigator.clipboard.writeText(preview);
  }

  return (
    <form onSubmit={handleFill} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {template.slotSchema.slots.map((slot) => (
          <div key={slot.key} className="space-y-1">
            <Label htmlFor={`slot-${slot.key}`}>
              {slot.label}
              {slot.required ? ' *' : ''}
            </Label>
            <Input
              id={`slot-${slot.key}`}
              value={slotValues[slot.key] ?? ''}
              onChange={(event) =>
                setSlotValues((prev) => ({
                  ...prev,
                  [slot.key]: event.target.value,
                }))
              }
              placeholder={slot.description}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? '채우는 중…' : '슬롯 채우기'}
        </Button>
        {preview ? (
          <Button type="button" variant="outline" onClick={copyPreview}>
            클립보드 복사
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {preview ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm font-medium">
          {preview}
        </p>
      ) : null}
    </form>
  );
}
