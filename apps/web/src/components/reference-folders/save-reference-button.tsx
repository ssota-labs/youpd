'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@youpd/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@youpd/ui/components/ui/dialog';
import { Label } from '@youpd/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@youpd/ui/components/ui/select';
import { Textarea } from '@youpd/ui/components/ui/textarea';

type FolderPickerRow = {
  folderId: string;
  folderName: string;
  groupId: string;
  groupTitle: string;
  consumerStage: string | null;
};

type SaveReferenceButtonProps = {
  harvestId: string;
  videoId: string;
  videoTitle: string;
};

export function SaveReferenceButton({
  harvestId,
  videoId,
  videoTitle,
}: SaveReferenceButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<FolderPickerRow[]>([]);
  const [folderId, setFolderId] = useState('');
  const [saveReason, setSaveReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    const res = await fetch('/api/reference-folders/picker');
    if (!res.ok) return;
    const data = (await res.json()) as { folders: FolderPickerRow[] };
    setFolders(data.folders);
    if (data.folders[0]) setFolderId(data.folders[0].folderId);
  }, []);

  useEffect(() => {
    if (open) void loadFolders();
  }, [open, loadFolders]);

  async function handleSave(allowSubGoodPlus = false) {
    if (!folderId) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/reference-folders/quick-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId,
        harvestId,
        videoId,
        saveReason: saveReason.trim() || null,
        allowSubGoodPlus,
      }),
    });
    setLoading(false);
    if (res.status === 409) {
      const payload = (await res.json()) as { code?: string; error?: string };
      if (payload.code === 'SUB_GOOD_PLUS' && !allowSubGoodPlus) {
        const ok = window.confirm(
          'Good+ 미만 성과입니다. 그래도 이 레퍼런스 폴더에 저장할까요?',
        );
        if (ok) void handleSave(true);
        return;
      }
      setError(payload.error ?? '저장할 수 없습니다');
      return;
    }
    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? '저장에 실패했습니다');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          레퍼런스에 저장
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>레퍼런스 폴더에 저장</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground line-clamp-2">{videoTitle}</p>
        {folders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            저장할 폴더가 없습니다.{' '}
            <a href="/references" className="underline">
              레퍼런스
            </a>
            에서 그룹을 먼저 만드세요.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="folder-select">폴더</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger id="folder-select">
                  <SelectValue placeholder="폴더 선택" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.folderId} value={folder.folderId}>
                      {folder.groupTitle} / {folder.folderName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-reason">저장 이유 (선택)</Label>
              <Textarea
                id="save-reason"
                value={saveReason}
                onChange={(e) => setSaveReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button
            type="button"
            disabled={loading || folders.length === 0}
            onClick={() => void handleSave()}
          >
            {loading ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
