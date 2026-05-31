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

type SaveSocialReferenceButtonProps = {
  socialPostId: string;
};

export function SaveSocialReferenceButton({ socialPostId }: SaveSocialReferenceButtonProps) {
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

  async function handleSave() {
    if (!folderId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/reference-folders/${folderId}/social-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        socialPostId,
        saveReason: saveReason.trim() || null,
      }),
    });
    setLoading(false);
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
        <Button type="button">레퍼런스에 저장</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>소셜 포스트를 레퍼런스 폴더에 저장</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="social-folder">폴더</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="social-folder">
                <SelectValue placeholder="폴더 선택" />
              </SelectTrigger>
              <SelectContent>
                {folders.map((row) => (
                  <SelectItem key={row.folderId} value={row.folderId}>
                    {row.groupTitle} · {row.folderName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="social-save-reason">저장 메모 (선택)</Label>
            <Textarea
              id="social-save-reason"
              value={saveReason}
              onChange={(e) => setSaveReason(e.target.value)}
              rows={3}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={loading}>
            {loading ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
