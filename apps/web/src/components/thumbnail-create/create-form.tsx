'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import type {
  CreativeTemplateSlot,
  ThumbnailCreateBootstrap,
  ThumbnailGenerationJob,
  ThumbnailSlotValues,
} from '@youpd/types';
import { SkeletonPreview } from '@/components/thumbnail-templates/skeleton-preview';
import { Badge } from '@youpd/ui/components/ui/badge';
import { Button } from '@youpd/ui/components/ui/button';
import { Input } from '@youpd/ui/components/ui/input';
import { Label } from '@youpd/ui/components/ui/label';

type Props = {
  templateId: string;
  initialBootstrap: ThumbnailCreateBootstrap;
};

function initialValuesFromBootstrap(
  bootstrap: ThumbnailCreateBootstrap,
): Record<string, string> {
  const draft = bootstrap.draft?.slotValues.values ?? {};
  const out: Record<string, string> = {};
  for (const slot of bootstrap.template.slotSchema.slots) {
    const existing = draft[slot.key];
    out[slot.key] =
      existing !== undefined && existing !== null ? String(existing) : '';
  }
  return out;
}

function toSlotValues(
  slots: CreativeTemplateSlot[],
  formValues: Record<string, string>,
): ThumbnailSlotValues {
  const values: Record<string, string | number> = {};
  for (const slot of slots) {
    const raw = formValues[slot.key] ?? '';
    if (slot.type === 'number') {
      const num = Number(raw);
      if (!Number.isNaN(num) && raw.trim() !== '') {
        values[slot.key] = num;
      }
    } else if (raw.trim() !== '') {
      values[slot.key] = raw.trim();
    }
  }
  return { version: 1, values };
}

export function ThumbnailCreateForm({ templateId, initialBootstrap }: Props) {
  const [bootstrap] = useState(initialBootstrap);
  const [formValues, setFormValues] = useState(() =>
    initialValuesFromBootstrap(initialBootstrap),
  );
  const [selectedRefs, setSelectedRefs] = useState<string[]>(
    () => initialBootstrap.draft?.selectedReferenceVideoIds ?? [],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [lastJob, setLastJob] = useState<ThumbnailGenerationJob | null>(null);
  const [pending, startTransition] = useTransition();

  const providerConfigured = bootstrap.providerStatus.configured;
  const slots = bootstrap.template.slotSchema.slots;

  const slotValuesPayload = useMemo(
    () => toSlotValues(slots, formValues),
    [slots, formValues],
  );

  const toggleRef = useCallback((videoId: string) => {
    setSelectedRefs((prev) => {
      if (prev.includes(videoId)) {
        return prev.filter((id) => id !== videoId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, videoId];
    });
  }, []);

  const saveDraft = useCallback(() => {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch('/api/thumbnail-create/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          slotValues: slotValuesPayload,
          selectedReferenceVideoIds:
            selectedRefs.length > 0 ? selectedRefs : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMessage(data.error ?? 'Draft save failed');
        return;
      }
      setMessage('초안이 저장되었습니다.');
    });
  }, [templateId, slotValuesPayload, selectedRefs]);

  const generate = useCallback(() => {
    startTransition(async () => {
      setMessage(null);
      setLastJob(null);
      const res = await fetch('/api/thumbnail-generation/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          slotValues: slotValuesPayload,
          selectedReferenceVideoIds:
            selectedRefs.length > 0 ? selectedRefs : undefined,
          draftId: bootstrap.draft?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(
          (data as { error?: string }).error ??
            (res.status === 409
              ? '이미지 생성 공급자가 설정되지 않았습니다. 초안만 저장할 수 있습니다.'
              : '생성에 실패했습니다.'),
        );
        return;
      }
      setLastJob(data as ThumbnailGenerationJob);
      setMessage('생성이 완료되었습니다.');
    });
  }, [templateId, slotValuesPayload, selectedRefs, bootstrap.draft?.id]);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8">
      <section className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {bootstrap.template.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {bootstrap.template.summary}
          </p>
        </div>
        <SkeletonPreview skeleton={bootstrap.template.skeleton} />
        {!providerConfigured ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            이미지 생성 공급자가 설정되지 않았습니다. 슬롯을 채운 뒤 초안만
            저장할 수 있습니다.
          </p>
        ) : null}
      </section>

      <section className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">슬롯 입력</h2>
          {slots.map((slot) => (
            <div key={slot.key} className="space-y-1.5">
              <Label htmlFor={`slot-${slot.key}`}>
                {slot.label}
                {slot.required ? ' *' : ''}
              </Label>
              <Input
                id={`slot-${slot.key}`}
                type={slot.type === 'number' ? 'number' : 'text'}
                value={formValues[slot.key] ?? ''}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [slot.key]: e.target.value,
                  }))
                }
                placeholder={slot.description}
              />
            </div>
          ))}
        </div>

        {bootstrap.template.references.length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">레퍼런스 (최대 3)</h2>
            <ul className="space-y-2">
              {bootstrap.template.references.map((ref) => (
                <li key={ref.videoId}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedRefs.includes(ref.videoId)}
                      onChange={() => toggleRef(ref.videoId)}
                    />
                    <span>
                      <span className="font-medium">{ref.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {ref.channelTitle}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={saveDraft}>
            초안 저장
          </Button>
          <Button
            type="button"
            disabled={pending || !providerConfigured}
            onClick={generate}
          >
            생성하기
          </Button>
        </div>

        {message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}

        {lastJob && lastJob.assets.length > 0 ? (
          <div className="space-y-3 border-t border-border pt-6">
            <h2 className="text-sm font-semibold">생성 결과</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {lastJob.assets.map((asset) => (
                <figure
                  key={asset.id}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.previewUrl}
                    alt=""
                    className="aspect-video w-full bg-muted object-cover"
                  />
                  <figcaption className="space-y-1 p-3 text-xs text-muted-foreground">
                    <Badge variant="outline">{asset.lineage.providerKey}</Badge>
                    <p className="font-mono truncate">{asset.lineage.promptHash.slice(0, 12)}…</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
