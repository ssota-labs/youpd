import { z } from 'zod';

export const YoupdWorkflowKindSchema = z.enum([
  'analyze-video',
  'analyze-channel',
  'search-keyword',
]);

export type YoupdWorkflowKind = z.infer<typeof YoupdWorkflowKindSchema>;

export const YoupdWorkflowPayloadSchema = z
  .object({
    kind: YoupdWorkflowKindSchema,
    input: z.record(z.string(), z.unknown()),
  })
  .strict();

export type YoupdWorkflowPayload = z.infer<typeof YoupdWorkflowPayloadSchema>;

export const GetJobStatusInputSchema = z
  .object({
    job_id: z.string().min(1),
  })
  .strict();

export type GetJobStatusInput = z.infer<typeof GetJobStatusInputSchema>;

export type JobEnqueueResult = {
  job_id: string;
  status: string;
  workflow: YoupdWorkflowKind;
};

export type JobStatusResult = {
  job_id: string;
  status: string;
  workflow: string | null;
  data?: unknown;
  error?: { message: string };
  created_at?: string;
};
