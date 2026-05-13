import { z } from 'zod';

export const HealthCheckRowSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  value: z.string().nullable(),
  createdAt: z.date(),
});
export type HealthCheckRow = z.infer<typeof HealthCheckRowSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  key: z.string(),
  value: z.string().nullable(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
