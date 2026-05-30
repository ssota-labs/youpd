'use client';

import { useCallback } from 'react';
import { ImageIcon } from 'lucide-react';

import { useFileUpload } from '@/hooks/use-file-upload';
import { cn } from '@/lib/utils';

const DEFAULT_MAX_SIZE_MB = 6;
const DEFAULT_MAX_SIZE = DEFAULT_MAX_SIZE_MB * 1024 * 1024;

export interface ImageUploadInputProps {
  /** Current image URL (e.g. after upload). When set, shows preview. */
  value: string | null;
  /** Called when user selects a file. Parent should upload and set value. */
  onFileSelect: (file: File) => void;
  /** Called when user removes the image. */
  onRemove: () => void;
  /** Show uploading state (disable drop zone, show message). */
  isUploading?: boolean;
  /** Max file size in bytes. Default 6MB. */
  maxSize?: number;
  disabled?: boolean;
  accept?: string;
  className?: string;
  /** Accessible label for the file input. */
  'aria-label'?: string;
}

/**
 * Image upload input: drop zone + preview.
 * Same UX as drive add dialog image form. Parent handles upload (e.g. uploadImageAction) and passes back URL as value.
 */
export function ImageUploadInput({
  value,
  onFileSelect,
  onRemove,
  isUploading = false,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  accept = 'image/*',
  className,
  'aria-label': ariaLabel = 'Upload image',
}: ImageUploadInputProps) {
  const [
    { files, isDragging, errors: uploadErrors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
      clearFiles,
    },
  ] = useFileUpload({
    accept,
    maxSize,
    multiple: false,
    onFilesAdded: (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (file instanceof File) {
        onFileSelect(file);
        clearFiles();
      }
    },
  });

  const handleRemove = useCallback(() => {
    clearFiles();
    onRemove();
  }, [clearFiles, onRemove]);

  const showPreview = value != null && value !== '';
  const maxSizeMB = Math.round(maxSize / (1024 * 1024));

  return (
    <div className={cn('space-y-2', className)}>
      {showPreview && (
        <div className="relative w-full aspect-video min-h-0 rounded-lg border border-border overflow-hidden bg-muted">
          <img
            src={value!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            disabled={disabled}
            className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-background/80 hover:bg-background border border-border disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      )}
      {!showPreview && (
        <div
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          onClick={disabled || isUploading ? undefined : openFileDialog}
          onKeyDown={(e) =>
            e.key === 'Enter' && !disabled && !isUploading && openFileDialog()
          }
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          className={cn(
            'rounded-lg border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center min-h-[120px] w-full min-w-0 transition-colors',
            !disabled && !isUploading && 'cursor-pointer hover:bg-muted/50',
            isDragging &&
              'border-blue-400 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/30',
            (disabled || isUploading) && 'pointer-events-none opacity-70'
          )}
        >
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label={ariaLabel}
            disabled={disabled || isUploading}
          />
          <div className="flex flex-col items-center justify-center text-center px-4 py-6">
            <div
              className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background"
              aria-hidden
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {isUploading
                ? 'Uploading...'
                : 'Drop image or click to upload'}
            </p>
            {!isUploading && (
              <p className="text-xs text-muted-foreground mt-1">
                Max {maxSizeMB}MB
              </p>
            )}
          </div>
          {uploadErrors[0] && (
            <p className="text-xs text-destructive mt-2 px-4">
              {uploadErrors[0]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
