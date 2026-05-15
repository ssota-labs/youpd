import { z } from 'zod';

// A composition's drawing surface. width/height are abstract design units —
// the renderer (canvas or satori) picks the device-pixel mapping. Keeping
// this generic means a profile can declare any aspect ratio without the
// core knowing about thumbnail-specific 16:9 / 9:16 enums.
export const CanvasSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
export type Canvas = z.infer<typeof CanvasSchema>;
