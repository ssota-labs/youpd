// OAuth + async workflow smoke: youpd_analyze_video → poll youpd_get_job_status.
import {
  ensureLocalMcpResource,
  extractStructured,
  mcpCall,
  obtainAccessToken,
} from './smoke-lib.mjs';

const TEST_VIDEO_ID = process.env.SMOKE_VIDEO_ID || 'jNQXAC9IVRw';
const POLL_MS = Number(process.env.SMOKE_POLL_MS || 2000);
const POLL_TIMEOUT_MS = Number(process.env.SMOKE_POLL_TIMEOUT_MS || 120_000);

function step(name) {
  console.log(`\n=== ${name} ===`);
}
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  ensureLocalMcpResource();

  step('1. OAuth token for MCP');
  const accessToken = await obtainAccessToken();
  console.log(`access_token (${accessToken.length}b)`);

  step('2. MCP initialize');
  await mcpCall(accessToken, 1, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'workflow-smoke', version: '0.0.0' },
  });

  step(`3. tools/call youpd_analyze_video (${TEST_VIDEO_ID})`);
  const enqueuePayload = await mcpCall(accessToken, 2, 'tools/call', {
    name: 'youpd_analyze_video',
    arguments: {
      videoId: TEST_VIDEO_ID,
      includeComments: false,
      commentsTopN: 0,
    },
  });
  const enqueue = extractStructured(enqueuePayload);
  if (!enqueue.job_id) fail(`enqueue missing job_id: ${JSON.stringify(enqueue)}`);
  console.log(`job_id=${enqueue.job_id} status=${enqueue.status} workflow=${enqueue.workflow}`);

  step('4. Poll youpd_get_job_status until terminal state');
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastStatus = enqueue.status;
  while (Date.now() < deadline) {
    const statusPayload = await mcpCall(accessToken, 3, 'tools/call', {
      name: 'youpd_get_job_status',
      arguments: { job_id: enqueue.job_id },
    });
    const statusBody = extractStructured(statusPayload);
    lastStatus = statusBody.status;
    console.log(`  status=${lastStatus}`);
    if (lastStatus === 'completed') {
      if (!statusBody.data) fail('completed job missing data');
      console.log(`✓ workflow completed (${JSON.stringify(statusBody.data).slice(0, 200)}…)`);
      console.log('\nWORKFLOW SMOKE PASSED ✓');
      return;
    }
    if (lastStatus === 'failed') {
      fail(`workflow failed: ${JSON.stringify(statusBody.error ?? statusBody)}`);
    }
    await sleep(POLL_MS);
  }
  fail(`timed out waiting for job ${enqueue.job_id} (last status=${lastStatus})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
