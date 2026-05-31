import { describe, expect, it } from 'vitest';
import {
  createReferenceGroup,
  getFolderWithVideos,
} from '../reference-folders/reference-folders-service';
import {
  addSocialPostToFolder,
  getFolderWithSocialPosts,
  ingestSocialUrl,
  listSocialPostSummaries,
} from './social-service';

const E2E_USER_ID = '00000000-0000-4000-8000-00000000e2e0';

describe('social posts (integration)', () => {
  it('ingests fixture URL, saves to reference folder, lists folder social posts', async () => {
    process.env.SOCIAL_USE_FIXTURES = 'true';
    const suffix = Date.now();
    const detail = await ingestSocialUrl(E2E_USER_ID, {
      url: `https://www.threads.net/@youpd_fixture/post/C0FIXTURE${suffix}`,
    });
    expect(detail.id).toBeTruthy();
    expect(detail.permalink).toContain('threads.net');

    const summaries = await listSocialPostSummaries(E2E_USER_ID);
    expect(summaries.some((row) => row.id === detail.id)).toBe(true);

    const group = await createReferenceGroup(E2E_USER_ID, {
      title: `S9 social ${suffix}`,
      audience: '크리에이터',
      seedTheme: 'social',
      intentSummary: 'S9 integration',
      seedStageFolders: false,
    });
    const folder = group.folders[0]!;

    await addSocialPostToFolder(E2E_USER_ID, folder.id, {
      socialPostId: detail.id,
      saveReason: 'social evidence',
    });

    const folderSocial = await getFolderWithSocialPosts(E2E_USER_ID, folder.id);
    expect(folderSocial.socialPosts).toHaveLength(1);
    expect(folderSocial.socialPosts[0]?.lineage.policyVersion).toBe('social_score_v1');

    const folderVideos = await getFolderWithVideos(E2E_USER_ID, folder.id);
    expect(folderVideos.videos).toEqual([]);
  });
});
