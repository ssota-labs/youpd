-- M3: Add history_cursor column for undo/redo navigation across
-- thumbnail_versions snapshots. Defaults to 0 (= "at latest").
alter table public.thumbnails
  add column if not exists history_cursor integer not null default 0;

comment on column public.thumbnails.history_cursor is
  'Steps into thumbnail_versions: 0 = latest, N = N undos applied. New edits prune positive cursors and reset to 0.';
