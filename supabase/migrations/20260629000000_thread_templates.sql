-- S10: Thread structure templates, social post evidence, generation jobs.

create table if not exists public.social_post_structure_evidence (
  id uuid primary key default gen_random_uuid(),
  social_post_id uuid not null references public.social_posts (id) on delete cascade,
  user_id uuid not null,
  structure_type text not null,
  hook_style text,
  structure_slots_json jsonb not null,
  sequence_pattern_json jsonb,
  manual_structure_notes_json jsonb,
  source_mode text not null,
  structure_extractor text not null,
  lineage_snapshot jsonb,
  created_at timestamptz not null default now(),
  unique (social_post_id)
);

create index if not exists social_post_structure_evidence_user_idx
  on public.social_post_structure_evidence (user_id);

alter table public.social_post_structure_evidence enable row level security;
drop policy if exists "deny_all" on public.social_post_structure_evidence;
create policy "deny_all"
  on public.social_post_structure_evidence
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_thread_examples (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  label text not null,
  filled_thread_text text not null,
  slot_values_json jsonb not null,
  part_count int,
  sort_order int not null default 0
);

alter table public.creative_template_thread_examples enable row level security;
drop policy if exists "deny_all" on public.creative_template_thread_examples;
create policy "deny_all"
  on public.creative_template_thread_examples
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_thread_evidence (
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  structure_evidence_id uuid not null references public.social_post_structure_evidence (id) on delete cascade,
  evidence_note text,
  sort_order int not null default 0,
  unique (template_id, structure_evidence_id)
);

alter table public.creative_template_thread_evidence enable row level security;
drop policy if exists "deny_all" on public.creative_template_thread_evidence;
create policy "deny_all"
  on public.creative_template_thread_evidence
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.thread_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_template_id uuid not null references public.creative_templates (id) on delete cascade,
  topic text not null,
  audience text,
  context_notes text,
  locale text not null default 'ko',
  status text not null,
  result_draft_text text,
  result_parts_json jsonb,
  lineage_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists thread_generation_jobs_user_created_idx
  on public.thread_generation_jobs (user_id, created_at desc);

alter table public.thread_generation_jobs enable row level security;
drop policy if exists "deny_all" on public.thread_generation_jobs;
create policy "deny_all"
  on public.thread_generation_jobs
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Thread browse categories (shared taxonomy table; story-arc / listicle may already exist).
insert into public.creative_template_categories (id, code, name, description, sort_order)
values
  ('a3000000-0000-4000-8000-000000000006', 'contrarian-take', '반론·주장', '통념을 뒤집는 스레드 오프닝', 30),
  ('a3000000-0000-4000-8000-000000000007', 'teardown', '뜯어보기', '대상을 분해·분석하는 구조', 31),
  ('a3000000-0000-4000-8000-000000000008', 'lesson', '교훈형', '배운 점·인사이트 중심', 32),
  ('a3000000-0000-4000-8000-000000000009', 'listicle', '리스트형', '번호·항목 나열 스레드', 33),
  ('a3000000-0000-4000-8000-000000000010', 'case-study', '케이스 스터디', '사례·전후·결과 중심', 34),
  ('a3000000-0000-4000-8000-000000000011', 'story-arc', '스토리 아크', '상황·전개·결말 내러티브', 35),
  ('a3000000-0000-4000-8000-000000000012', 'tactical-checklist', '실행 체크리스트', '단계·팁 나열형', 36),
  ('a3000000-0000-4000-8000-000000000013', 'myth-bust', '미신 깨기', '잘못된 믿음을 반박', 37)
on conflict (code) do nothing;

insert into public.creative_template_tags (id, code, name, kind)
values
  ('b3000000-0000-4000-8000-000000000004', 'first-person', '1인칭', 'technique'),
  ('b3000000-0000-4000-8000-000000000005', 'stat-led', '숫자·통계', 'technique'),
  ('b3000000-0000-4000-8000-000000000006', 'thread-5', '5파트 스레드', 'technique'),
  ('b3000000-0000-4000-8000-000000000007', 'thread-10', '10파트 스레드', 'technique'),
  ('b3000000-0000-4000-8000-000000000008', 'korean-casual', '한국어 캐주얼', 'technique'),
  ('b3000000-0000-4000-8000-000000000009', 'english-casual', '영어 캐주얼', 'technique')
on conflict (code) do nothing;

insert into public.creative_templates (
  id,
  kind,
  code,
  name,
  summary,
  use_when,
  skeleton_json,
  slot_schema_json,
  prompt_scaffold,
  default_style_json,
  status
)
values
  (
    'd3000000-0000-4000-8000-000000000001',
    'thread',
    'contrarian-hook-insight-cta',
    '반론 훅 · 통찰 · CTA',
    '통념을 건드린 뒤 통찰과 행동 유도로 마무리합니다.',
    '논쟁·의견·업계 통념을 뒤집을 때',
    '{"version":1,"slotOrder":["hook","tension","insight","cta"],"postCountHint":5,"locale":"ko"}',
    '{"version":1,"slots":[{"key":"hook","label":"훅","type":"text","required":true},{"key":"tension","label":"갈등·문제","type":"text","required":true},{"key":"insight","label":"통찰","type":"text","required":true},{"key":"cta","label":"행동 유도","type":"text","required":true}]}',
    '',
    '{"structureType":"contrarian_take","hookStyle":"bold-claim","tone":"direct","locale":"ko"}',
    'published'
  ),
  (
    'd3000000-0000-4000-8000-000000000002',
    'thread',
    'teardown-proof-bridge',
    '뜯어보기 · 증거 · 연결',
    '대상을 분해하고 증거로 뒷받침한 뒤 다음 파트로 연결합니다.',
    '제품·전략·콘텐츠 분석 스레드',
    '{"version":1,"slotOrder":["hook","context","proof","bridge"],"postCountHint":6,"locale":"ko"}',
    '{"version":1,"slots":[{"key":"hook","label":"훅","type":"text","required":true},{"key":"context","label":"배경","type":"text","required":true},{"key":"proof","label":"증거","type":"text","required":true},{"key":"bridge","label":"연결","type":"text","required":false}]}',
    '',
    '{"structureType":"teardown","hookStyle":"question","tone":"analytical","locale":"ko"}',
    'published'
  ),
  (
    'd3000000-0000-4000-8000-000000000003',
    'thread',
    'lesson-context-insight-cta',
    '교훈 · 배경 · 통찰',
    '배경을 짧게 깔고 배운 점을 전달합니다.',
    '경험담·실험 결과·하우투 인사이트',
    '{"version":1,"slotOrder":["hook","context","insight","cta"],"postCountHint":5,"locale":"ko"}',
    '{"version":1,"slots":[{"key":"hook","label":"훅","type":"text","required":true},{"key":"context","label":"배경","type":"text","required":true},{"key":"insight","label":"통찰","type":"text","required":true},{"key":"cta","label":"행동 유도","type":"text","required":true}]}',
    '',
    '{"structureType":"lesson","hookStyle":"first-person","tone":"warm","locale":"ko"}',
    'published'
  ),
  (
    'd3000000-0000-4000-8000-000000000004',
    'thread',
    'listicle-tactical-five',
    '리스트 · 실행 팁 5파트',
    '번호·항목으로 실행 가능한 팁을 나열합니다.',
    '체크리스트·단계별 가이드·툴 모음',
    '{"version":1,"slotOrder":["hook","tactical_step","tactical_step","tactical_step","cta"],"postCountHint":5,"locale":"ko"}',
    '{"version":1,"slots":[{"key":"hook","label":"훅","type":"text","required":true},{"key":"tactical_step","label":"실행 팁","type":"text","required":true},{"key":"cta","label":"행동 유도","type":"text","required":true}]}',
    '',
    '{"structureType":"listicle","hookStyle":"stat-led","tone":"practical","locale":"ko"}',
    'published'
  ),
  (
    'd3000000-0000-4000-8000-000000000005',
    'thread',
    'case-study-story-proof',
    '케이스 · 스토리 · 증거',
    '사례 내러티브와 증거를 교차합니다.',
    '전후 비교·클라이언트·실험 사례',
    '{"version":1,"slotOrder":["hook","context","proof","insight","cta"],"postCountHint":7,"locale":"ko"}',
    '{"version":1,"slots":[{"key":"hook","label":"훅","type":"text","required":true},{"key":"context","label":"배경","type":"text","required":true},{"key":"proof","label":"증거","type":"text","required":true},{"key":"insight","label":"통찰","type":"text","required":true},{"key":"cta","label":"행동 유도","type":"text","required":false}]}',
    '',
    '{"structureType":"case_study","hookStyle":"bold-claim","tone":"narrative","locale":"ko"}',
    'published'
  ),
  (
    'd3000000-0000-4000-8000-000000000006',
    'thread',
    'myth-bust-stat-cta',
    '미신 깨기 · 숫자 · CTA',
    '잘못된 믿음을 숫자로 반박하고 다음 행동을 제안합니다.',
    '업계 미신·오해·상식 깨기',
    '{"version":1,"slotOrder":["hook","tension","proof","insight","cta"],"postCountHint":6,"locale":"ko"}',
    '{"version":1,"slots":[{"key":"hook","label":"훅","type":"text","required":true},{"key":"tension","label":"갈등","type":"text","required":true},{"key":"proof","label":"증거","type":"text","required":true},{"key":"insight","label":"통찰","type":"text","required":true},{"key":"cta","label":"행동 유도","type":"text","required":true}]}',
    '',
    '{"structureType":"myth_bust","hookStyle":"stat-led","tone":"confident","locale":"ko"}',
    'published'
  )
on conflict (code) do nothing;

insert into public.creative_template_category_links (template_id, category_id)
select t.id, c.id
from (values
  ('contrarian-hook-insight-cta', 'contrarian-take'),
  ('teardown-proof-bridge', 'teardown'),
  ('lesson-context-insight-cta', 'lesson'),
  ('listicle-tactical-five', 'listicle'),
  ('listicle-tactical-five', 'tactical-checklist'),
  ('case-study-story-proof', 'case-study'),
  ('case-study-story-proof', 'story-arc'),
  ('myth-bust-stat-cta', 'myth-bust')
) as v(tpl, cat)
join public.creative_templates t on t.code = v.tpl
join public.creative_template_categories c on c.code = v.cat
on conflict do nothing;

insert into public.creative_template_tag_links (template_id, tag_id)
select t.id, g.id
from (values
  ('contrarian-hook-insight-cta', 'first-person'),
  ('contrarian-hook-insight-cta', 'korean-casual'),
  ('teardown-proof-bridge', 'thread-5'),
  ('lesson-context-insight-cta', 'first-person'),
  ('lesson-context-insight-cta', 'korean-casual'),
  ('listicle-tactical-five', 'thread-5'),
  ('listicle-tactical-five', 'stat-led'),
  ('case-study-story-proof', 'thread-10'),
  ('myth-bust-stat-cta', 'stat-led'),
  ('myth-bust-stat-cta', 'english-casual')
) as v(tpl, tag)
join public.creative_templates t on t.code = v.tpl
join public.creative_template_tags g on g.code = v.tag
on conflict do nothing;

-- S10 seed user for social_posts FK (local / integration).
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000a10e0',
  'authenticated',
  'authenticated',
  's10-thread-seed@youpd.local',
  crypt('s10-thread-seed-password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into public.social_posts (
  id,
  user_id,
  provider,
  external_id,
  permalink,
  permalink_hash,
  author_handle,
  author_display_name,
  text_content,
  published_at,
  ingest_mode,
  fetch_status
)
values
  (
    'f3000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-00000000a10e0',
    'threads',
    's10-seed-thread-01',
    'https://www.threads.net/@youpd_s10_seed/post/C0S10SEED001',
    encode(digest('https://www.threads.net/@youpd_s10_seed/post/C0S10SEED001', 'sha256'), 'hex'),
    'youpd_s10_seed',
    'YouPD S10 Seed',
    E'알고리즘 공부는 시간 낭비라고요?\n사실은 훅 구조가 CTR을 2배 올렸습니다.\n30일 실험 데이터를 스레드로 정리했어요.\n저장해 두고 다음 업로드에 써 보세요.',
    '2026-05-28T09:00:00+00',
    'manual',
    'ok'
  ),
  (
    'f3000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-00000000a10e0',
    'threads',
    's10-seed-thread-02',
    'https://www.threads.net/@youpd_s10_seed/post/C0S10SEED002',
    encode(digest('https://www.threads.net/@youpd_s10_seed/post/C0S10SEED002', 'sha256'), 'hex'),
    'youpd_s10_seed',
    'YouPD S10 Seed',
    E'이 썸네일 템플릿을 뜯어볼게요.\n왜 숫자가 왼쪽에 있는지.\n왜 얼굴이 작은지.\n다음 파트에서 Before/After 비교합니다.',
    '2026-05-28T10:15:00+00',
    'manual',
    'ok'
  ),
  (
    'f3000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-00000000a10e0',
    'threads',
    's10-seed-thread-03',
    'https://www.threads.net/@youpd_s10_seed/post/C0S10SEED003',
    encode(digest('https://www.threads.net/@youpd_s10_seed/post/C0S10SEED003', 'sha256'), 'hex'),
    'youpd_s10_seed',
    'YouPD S10 Seed',
    E'작년에 쇼츠만 올렸을 때 조회수가 정체됐어요.\n그때 배운 건 길이가 아니라 훅이었습니다.\n지금은 첫 줄에 갈등을 넣습니다.\n댓글로 쓰는 훅 문장도 공유할게요.',
    '2026-05-29T08:30:00+00',
    'manual',
    'ok'
  ),
  (
    'f3000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-00000000a10e0',
    'threads',
    's10-seed-thread-04',
    'https://www.threads.net/@youpd_s10_seed/post/C0S10SEED004',
    encode(digest('https://www.threads.net/@youpd_s10_seed/post/C0S10SEED004', 'sha256'), 'hex'),
    'youpd_s10_seed',
    'YouPD S10 Seed',
    E'크리에이터 스레드 5단 구성:\n1) 숫자 훅\n2) 문제 정의\n3) 팁 1\n4) 팁 2\n5) CTA',
    '2026-05-29T11:00:00+00',
    'manual',
    'ok'
  ),
  (
    'f3000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-00000000a10e0',
    'threads',
    's10-seed-thread-05',
    'https://www.threads.net/@youpd_s10_seed/post/C0S10SEED005',
    encode(digest('https://www.threads.net/@youpd_s10_seed/post/C0S10SEED005', 'sha256'), 'hex'),
    'youpd_s10_seed',
    'YouPD S10 Seed',
    E'클라이언트 A는 14일 만에 구독자 12%를 올렸습니다.\n전에는 제목만 바꿨고, 이후엔 썸네일+훅을 같이 바꿨어요.\n케이스 전체는 노션에 정리해 두었습니다.',
    '2026-05-30T07:45:00+00',
    'manual',
    'ok'
  ),
  (
    'f3000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-00000000a10e0',
    'threads',
    's10-seed-thread-06',
    'https://www.threads.net/@youpd_s10_seed/post/C0S10SEED006',
    encode(digest('https://www.threads.net/@youpd_s10_seed/post/C0S10SEED006', 'sha256'), 'hex'),
    'youpd_s10_seed',
    'YouPD S10 Seed',
    E'Myth: longer videos always win.\n87% of our tests showed hook beats length.\nSave this before your next upload.',
    '2026-05-30T14:20:00+00',
    'manual',
    'ok'
  )
on conflict (id) do nothing;

insert into public.social_post_structure_evidence (
  id,
  social_post_id,
  user_id,
  structure_type,
  hook_style,
  structure_slots_json,
  sequence_pattern_json,
  source_mode,
  structure_extractor,
  lineage_snapshot
)
values
  (
    'e3000000-0000-4000-8000-000000000001',
    'f3000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-00000000a10e0',
    'contrarian_take',
    'bold-claim',
    '{"hook":"알고리즘 공부는 시간 낭비라고요?","tension":"사실은 훅 구조가 CTR을 2배 올렸습니다.","insight":"30일 실험 데이터를 스레드로 정리했어요.","cta":"저장해 두고 다음 업로드에 써 보세요."}',
    '{"partCount":4,"pattern":["hook","tension","insight","cta"]}',
    'imported_seed',
    'deterministic_v1',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S10 seed","keywordRank":1,"policyVersion":"social_score_v1","performanceGrade":"Great","engagementGrade":"Good","recencyGrade":"Good","rankScore":14,"recommendationReason":"Seed thread evidence","poolSource":"threads"}'
  ),
  (
    'e3000000-0000-4000-8000-000000000002',
    'f3000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-00000000a10e0',
    'teardown',
    'question',
    '{"hook":"이 썸네일 템플릿을 뜯어볼게요.","context":"왜 숫자가 왼쪽에 있는지.","proof":"왜 얼굴이 작은지.","bridge":"다음 파트에서 Before/After 비교합니다."}',
    '{"partCount":4,"pattern":["hook","context","proof","bridge"]}',
    'imported_seed',
    'deterministic_v1',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S10 seed","keywordRank":2,"policyVersion":"social_score_v1","performanceGrade":"Good","engagementGrade":"Good","recencyGrade":"Normal","rankScore":9,"recommendationReason":"Seed thread evidence","poolSource":"threads"}'
  ),
  (
    'e3000000-0000-4000-8000-000000000003',
    'f3000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-00000000a10e0',
    'lesson',
    'first-person',
    '{"hook":"작년에 쇼츠만 올렸을 때 조회수가 정체됐어요.","context":"그때 배운 건 길이가 아니라 훅이었습니다.","insight":"지금은 첫 줄에 갈등을 넣습니다.","cta":"댓글로 쓰는 훅 문장도 공유할게요."}',
    '{"partCount":4,"pattern":["hook","context","insight","cta"]}',
    'manual',
    'manual',
    null
  ),
  (
    'e3000000-0000-4000-8000-000000000004',
    'f3000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-00000000a10e0',
    'listicle',
    'stat-led',
    '{"hook":"크리에이터 스레드 5단 구성:","tacticalStep":"1) 숫자 훅 → 2) 문제 정의 → 3–4) 팁 → 5) CTA","cta":"저장 후 다음 스레드에 적용"}',
    '{"partCount":5,"pattern":["hook","list","list","list","cta"]}',
    'imported_seed',
    'deterministic_v1',
    null
  ),
  (
    'e3000000-0000-4000-8000-000000000005',
    'f3000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-00000000a10e0',
    'case_study',
    'bold-claim',
    '{"hook":"클라이언트 A는 14일 만에 구독자 12%를 올렸습니다.","context":"전에는 제목만 바꿨고, 이후엔 썸네일+훅을 같이 바꿨어요.","proof":"케이스 전체는 노션에 정리해 두었습니다."}',
    '{"partCount":3,"pattern":["hook","context","proof"]}',
    'manual',
    'manual',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S10 seed","keywordRank":3,"policyVersion":"social_score_v1","performanceGrade":"Good","engagementGrade":"Good","recencyGrade":"Good","rankScore":11,"recommendationReason":"Manual case study seed","poolSource":"threads"}'
  ),
  (
    'e3000000-0000-4000-8000-000000000006',
    'f3000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-00000000a10e0',
    'myth_bust',
    'stat-led',
    '{"hook":"Myth: longer videos always win.","tension":"87% of our tests showed hook beats length.","proof":"Save this before your next upload.","cta":"Reply if you want the checklist."}',
    '{"partCount":4,"pattern":["hook","tension","proof","cta"]}',
    'imported_seed',
    'deterministic_v1',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S10 seed","keywordRank":1,"policyVersion":"social_score_v1","performanceGrade":"Great","engagementGrade":"Good","recencyGrade":"Good","rankScore":15,"recommendationReason":"Seed thread evidence","poolSource":"threads"}'
  )
on conflict (id) do nothing;

insert into public.creative_template_thread_evidence (template_id, structure_evidence_id, sort_order)
select t.id, e.id, v.ord
from (values
  ('contrarian-hook-insight-cta', 'e3000000-0000-4000-8000-000000000001', 0),
  ('teardown-proof-bridge', 'e3000000-0000-4000-8000-000000000002', 0),
  ('lesson-context-insight-cta', 'e3000000-0000-4000-8000-000000000003', 0),
  ('listicle-tactical-five', 'e3000000-0000-4000-8000-000000000004', 0),
  ('case-study-story-proof', 'e3000000-0000-4000-8000-000000000005', 0),
  ('myth-bust-stat-cta', 'e3000000-0000-4000-8000-000000000006', 0)
) as v(tpl, eid, ord)
join public.creative_templates t on t.code = v.tpl
join public.social_post_structure_evidence e on e.id = v.eid::uuid
on conflict do nothing;

insert into public.creative_template_thread_examples (
  template_id,
  label,
  filled_thread_text,
  slot_values_json,
  part_count,
  sort_order
)
select t.id, v.label, v.filled, v.slots::jsonb, v.parts, v.ord
from (values
  (
    'contrarian-hook-insight-cta',
    '알고리즘 반론',
    E'【훅】\n알고리즘 공부는 시간 낭비라고요?\n\n【갈등·문제】\n사실은 훅 구조가 CTR을 2배 올렸습니다.\n\n【통찰】\n30일 실험 데이터를 스레드로 정리했어요.\n\n【행동 유도】\n저장해 두고 다음 업로드에 써 보세요.',
    '{"hook":"알고리즘 공부는 시간 낭비라고요?","tension":"사실은 훅 구조가 CTR을 2배 올렸습니다.","insight":"30일 실험 데이터를 스레드로 정리했어요.","cta":"저장해 두고 다음 업로드에 써 보세요."}',
    4,
    0
  ),
  (
    'listicle-tactical-five',
    '5단 체크리스트',
    E'【훅】\n크리에이터 스레드 5단 구성:\n\n【실행 팁】\n1) 숫자 훅 2) 문제 정의 3) 팁 4) 팁 5) CTA',
    '{"hook":"크리에이터 스레드 5단 구성:","tactical_step":"1) 숫자 훅 → 5) CTA","cta":"저장 후 적용"}',
    5,
    0
  )
) as v(tpl, label, filled, slots, parts, ord)
join public.creative_templates t on t.code = v.tpl
on conflict do nothing;
