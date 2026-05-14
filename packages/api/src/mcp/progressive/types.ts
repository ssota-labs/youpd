import { z } from 'zod';

export const SkillGroupCodeSchema = z.enum([
  'SYS',
  'COLLECT',
  'METRIC',
  'COMMENT',
  'PLAN',
  'REPORT',
  'THUMB',
]);
export type SkillGroupCode = z.infer<typeof SkillGroupCodeSchema>;

export const GroupStatusSchema = z.enum([
  'available',
  'reserved',
  'trigger_only',
]);
export type GroupStatus = z.infer<typeof GroupStatusSchema>;

export const ToolDocSchema = z.object({
  name: z.string(),
  group_code: SkillGroupCodeSchema,
  short_description: z.string().min(1),
  long_description: z.string().min(1),
  when_to_use: z.string().min(1),
  example_calls: z.array(z.string()).default([]),
  quota_cost: z.string(),
  tags: z.array(z.string()).default([]),
});
export type ToolDoc = z.infer<typeof ToolDocSchema>;

export const GroupDocSchema = z.object({
  code: SkillGroupCodeSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  when_to_use: z.string().min(1),
  example_intents: z.array(z.string().min(1)).min(1),
  status: GroupStatusSchema,
  notes: z.string().optional(),
});
export type GroupDoc = z.infer<typeof GroupDocSchema>;

export const GetSkillGroupInputSchema = z
  .object({ code: SkillGroupCodeSchema })
  .strict();
export type GetSkillGroupInput = z.infer<typeof GetSkillGroupInputSchema>;

export const GetSkillGroupOutputSchema = z.object({
  code: SkillGroupCodeSchema,
  name: z.string(),
  status: GroupStatusSchema,
  description: z.string(),
  when_to_use: z.string(),
  example_intents: z.array(z.string()),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      when_to_use: z.string(),
      example_calls: z.array(z.string()),
      quota_cost: z.string(),
    }),
  ),
  notes: z.string().optional(),
});
export type GetSkillGroupOutput = z.infer<typeof GetSkillGroupOutputSchema>;
