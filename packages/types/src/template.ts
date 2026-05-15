import { z } from 'zod';
import { AspectSchema, ThumbnailDocumentSchema } from './thumbnail';

export const TemplateDocumentSchema = ThumbnailDocumentSchema;
export type TemplateDocument = z.infer<typeof TemplateDocumentSchema>;

export const FillersSchema = z.record(z.string(), z.string());
export type Fillers = z.infer<typeof FillersSchema>;

export const TemplateSchema = z
  .object({
    code: z.string().min(1).max(60),
    title: z.string().min(1).max(200),
    aspect: AspectSchema,
    document: TemplateDocumentSchema,
    previewUrl: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    isPublic: z.boolean().default(true),
  })
  .strict();
export type Template = z.infer<typeof TemplateSchema>;
