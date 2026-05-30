import type { HomeProfileInput, KeywordProbe } from '@youpd/types';
import {
  createKeywordIdeaRun,
  insertUserKeywordProbes,
  listActiveUserProbes,
} from '@youpd/supabase';
import { generateStubProbes } from './stub-probe-generator';

export type GenerateKeywordProbesResult = {
  probes: KeywordProbe[];
  provider: string;
  runId: string;
  llmConfigured: boolean;
};

function isLlmConfigured(): boolean {
  return Boolean(
    process.env.YOUPD_LLM_PROVIDER &&
      (process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.YOUPD_LLM_API_KEY),
  );
}

export async function generateKeywordProbes(
  userId: string,
  profile: HomeProfileInput,
): Promise<GenerateKeywordProbesResult> {
  const llmConfigured = isLlmConfigured();
  const provider = llmConfigured ? 'llm' : 'stub';

  const drafts = generateStubProbes(profile);
  const run = await createKeywordIdeaRun({
    userId,
    profileSnapshot: profile,
    provider,
    status: 'completed',
  });

  const inserted = await insertUserKeywordProbes(userId, run.id, drafts);
  const active = await listActiveUserProbes(userId);

  return {
    probes: active.length > 0 ? active : inserted,
    provider,
    runId: run.id,
    llmConfigured,
  };
}
