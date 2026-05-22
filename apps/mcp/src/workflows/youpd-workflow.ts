import {
  AnalyzeChannelInputSchema,
  AnalyzeVideoInputSchema,
  SearchKeywordWorkflowInputSchema,
  ensureChannelAnalysis,
  ensureVideoAnalysis,
  runKeywordSearchAnalysis,
} from '@youpd/api/youtube';
import type { YoupdWorkflowPayload } from './schemas';

export async function runYoupdWorkflow(payload: YoupdWorkflowPayload) {
  'use workflow';

  return runYoupdWorkflowStep(payload);
}

async function runYoupdWorkflowStep(payload: YoupdWorkflowPayload) {
  'use step';

  switch (payload.kind) {
    case 'analyze-video':
      return ensureVideoAnalysis(AnalyzeVideoInputSchema.parse(payload.input));
    case 'analyze-channel':
      return ensureChannelAnalysis(
        AnalyzeChannelInputSchema.parse(payload.input),
      );
    case 'search-keyword':
      return runKeywordSearchAnalysis(
        SearchKeywordWorkflowInputSchema.parse(payload.input),
      );
    default:
      throw new Error(`Unsupported workflow kind: ${String(payload.kind)}`);
  }
}
