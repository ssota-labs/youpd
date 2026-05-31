-- S8: Intro structure templates, transcripts, intro segments, generation jobs.

create table if not exists public.video_transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id text not null references public.youtube_videos (video_id) on delete cascade,
  workspace_id uuid,
  provider text not null,
  availability text not null,
  legal_notice_code text,
  language text not null default 'ko',
  segments_json jsonb,
  full_text text,
  fetched_at timestamptz not null default now(),
  error_message text,
  user_triggered text not null default 'true',
  unique (video_id)
);

alter table public.video_transcripts enable row level security;
drop policy if exists "deny_all" on public.video_transcripts;
create policy "deny_all"
  on public.video_transcripts
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.video_intro_segments (
  id uuid primary key default gen_random_uuid(),
  video_id text not null references public.youtube_videos (video_id) on delete cascade,
  transcript_id uuid references public.video_transcripts (id) on delete set null,
  source_folder_video_id uuid references public.reference_folder_videos (id) on delete set null,
  window_start_ms int not null default 0,
  window_end_ms int not null default 30000,
  excerpt_text text not null,
  structure_slots_json jsonb not null,
  manual_structure_notes_json jsonb,
  source_mode text not null,
  structure_extractor text not null,
  lineage_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists video_intro_segments_video_idx
  on public.video_intro_segments (video_id);

alter table public.video_intro_segments enable row level security;
drop policy if exists "deny_all" on public.video_intro_segments;
create policy "deny_all"
  on public.video_intro_segments
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_intro_examples (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  label text not null,
  filled_intro text not null,
  slot_values_json jsonb not null,
  sort_order int not null default 0
);

alter table public.creative_template_intro_examples enable row level security;
drop policy if exists "deny_all" on public.creative_template_intro_examples;
create policy "deny_all"
  on public.creative_template_intro_examples
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_intro_evidence (
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  intro_segment_id uuid not null references public.video_intro_segments (id) on delete cascade,
  evidence_note text,
  sort_order int not null default 0,
  unique (template_id, intro_segment_id)
);

alter table public.creative_template_intro_evidence enable row level security;
drop policy if exists "deny_all" on public.creative_template_intro_evidence;
create policy "deny_all"
  on public.creative_template_intro_evidence
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.intro_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  intro_template_id uuid not null references public.creative_templates (id) on delete cascade,
  user_brief text not null,
  status text not null,
  result_draft_text text,
  lineage_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists intro_generation_jobs_user_created_idx
  on public.intro_generation_jobs (user_id, created_at desc);

alter table public.intro_generation_jobs enable row level security;
drop policy if exists "deny_all" on public.intro_generation_jobs;
create policy "deny_all"
  on public.intro_generation_jobs
  for all
  to anon, authenticated
  using (false)
  with check (false);

insert into public.creative_template_categories (id, code, name, description, sort_order)
values
  ('a3000000-0000-4000-8000-000000000001', 'problem-solution', '문제·해결', '갈등 후 해결을 약속하는 인트로', 20),
  ('a3000000-0000-4000-8000-000000000002', 'story-arc', '스토리 아크', '상황·전개·반전이 있는 내러티브', 21),
  ('a3000000-0000-4000-8000-000000000003', 'credibility-first', '신뢰 우선', '증거·실적을 먼저 제시', 22),
  ('a3000000-0000-4000-8000-000000000004', 'bold-claim', '강한 주장', '의외의 주장으로 시선을 끔', 23),
  ('a3000000-0000-4000-8000-000000000005', 'tutorial-hook', '튜토리얼 훅', '학습·달성 약속형 오프닝', 24)
on conflict (code) do nothing;

insert into public.creative_template_tags (id, code, name, kind)
values
  ('b3000000-0000-4000-8000-000000000001', 'first-30s', '첫 30초', 'technique'),
  ('b3000000-0000-4000-8000-000000000002', 'korean-voiceover', '한국어 보이스', 'technique'),
  ('b3000000-0000-4000-8000-000000000003', 'manual-fallback', '수동 구조', 'technique')
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
    'd2000000-0000-4000-8000-000000000001',
    'intro',
    'problem-tension-promise',
    '문제 → 긴장 → 약속',
    '시청자의 상황을 짚고 갈등을 만든 뒤 본편 약속으로 연결합니다.',
    '교육·하우투·실험 결과를 소개할 때',
    '{"version":1,"slotOrder":["situation","tension","promise","transition"],"locale":"ko"}',
    '{"version":1,"slots":[{"key":"situation","label":"상황","type":"text","required":true},{"key":"tension","label":"갈등","type":"text","required":true},{"key":"promise","label":"약속","type":"text","required":true},{"key":"transition","label":"연결","type":"text","required":false}]}',
    '',
    '{"primaryCategory":"problem-solution","pacing":"fast","locale":"ko"}',
    'published'
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'intro',
    'surprise-credibility-bridge',
    '반전 주장 · 신뢰 · 연결',
    '의외의 주장 뒤 증거를 제시하고 본편으로 넘깁니다.',
    '데이터·실험·비교 콘텐츠일 때',
    '{"version":1,"slotOrder":["surprising_claim","credibility_proof","promise","transition"],"locale":"ko"}',
    '{"version":1,"slots":[{"key":"surprising_claim","label":"반전 주장","type":"text","required":true},{"key":"credibility_proof","label":"신뢰","type":"text","required":true},{"key":"promise","label":"약속","type":"text","required":true}]}',
    '',
    '{"primaryCategory":"bold-claim","pacing":"fast","locale":"ko"}',
    'published'
  ),
  (
    'd2000000-0000-4000-8000-000000000003',
    'intro',
    'story-situation-arc',
    '스토리 상황 · 전개',
    '짧은 일화로 몰입한 뒤 핵심 질문을 던집니다.',
    '브이로그·케이스 스터디·여정형 콘텐츠',
    '{"version":1,"slotOrder":["situation","tension","surprising_claim","transition"],"locale":"ko"}',
    '{"version":1,"slots":[{"key":"situation","label":"상황","type":"text","required":true},{"key":"tension","label":"전개","type":"text","required":true},{"key":"surprising_claim","label":"반전","type":"text","required":false}]}',
    '',
    '{"primaryCategory":"story-arc","pacing":"measured","locale":"ko"}',
    'published'
  ),
  (
    'd2000000-0000-4000-8000-000000000004',
    'intro',
    'credibility-promise',
    '신뢰 · 약속',
    '실적·권위를 먼저 보여 주고 시청 이유를 명확히 합니다.',
    '전문가·B2B·고가치 주제',
    '{"version":1,"slotOrder":["credibility_proof","promise","transition"],"locale":"ko"}',
    '{"version":1,"slots":[{"key":"credibility_proof","label":"신뢰","type":"text","required":true},{"key":"promise","label":"약속","type":"text","required":true}]}',
    '',
    '{"primaryCategory":"credibility-first","pacing":"measured","locale":"ko"}',
    'published'
  ),
  (
    'd2000000-0000-4000-8000-000000000005',
    'intro',
    'tutorial-fast-hook',
    '튜토리얼 · 빠른 훅',
    '기한·결과를 앞에 두고 바로 본편으로 연결합니다.',
    '튜토리얼·스킬업·체크리스트 영상',
    '{"version":1,"slotOrder":["situation","promise","transition"],"locale":"ko"}',
    '{"version":1,"slots":[{"key":"situation","label":"상황","type":"text","required":true},{"key":"promise","label":"약속","type":"text","required":true},{"key":"transition","label":"연결","type":"text","required":true}]}',
    '',
    '{"primaryCategory":"tutorial-hook","pacing":"fast","locale":"ko"}',
    'published'
  ),
  (
    'd2000000-0000-4000-8000-000000000006',
    'intro',
    'full-six-slot',
    '6슬롯 풀 구조',
    '상황부터 연결까지 모든 슬롯을 채우는 범용 패턴입니다.',
    '긴 인트로·복합 주제·다큐형 오프닝',
    '{"version":1,"slotOrder":["situation","tension","surprising_claim","credibility_proof","promise","transition"],"locale":"ko"}',
    '{"version":1,"slots":[{"key":"situation","label":"상황","type":"text","required":true},{"key":"tension","label":"갈등","type":"text","required":true},{"key":"surprising_claim","label":"주장","type":"text","required":true},{"key":"credibility_proof","label":"신뢰","type":"text","required":true},{"key":"promise","label":"약속","type":"text","required":true},{"key":"transition","label":"연결","type":"text","required":true}]}',
    '',
    '{"primaryCategory":"story-arc","pacing":"measured","locale":"ko"}',
    'published'
  )
on conflict (code) do nothing;

insert into public.creative_template_category_links (template_id, category_id)
select t.id, c.id
from (values
  ('problem-tension-promise', 'problem-solution'),
  ('surprise-credibility-bridge', 'bold-claim'),
  ('story-situation-arc', 'story-arc'),
  ('credibility-promise', 'credibility-first'),
  ('tutorial-fast-hook', 'tutorial-hook'),
  ('full-six-slot', 'story-arc')
) as v(tpl, cat)
join public.creative_templates t on t.code = v.tpl
join public.creative_template_categories c on c.code = v.cat
on conflict do nothing;

insert into public.creative_template_tag_links (template_id, tag_id)
select t.id, g.id
from (values
  ('problem-tension-promise', 'first-30s'),
  ('surprise-credibility-bridge', 'first-30s'),
  ('story-situation-arc', 'korean-voiceover'),
  ('tutorial-fast-hook', 'first-30s'),
  ('full-six-slot', 'first-30s'),
  ('full-six-slot', 'manual-fallback')
) as v(tpl, tag)
join public.creative_templates t on t.code = v.tpl
join public.creative_template_tags g on g.code = v.tag
on conflict do nothing;

insert into public.video_transcripts (
  id,
  video_id,
  provider,
  availability,
  language,
  segments_json,
  full_text
)
values
  (
    'f1000000-0000-4000-8000-000000000001',
    's5-seed-video-01',
    'manual_upload',
    'available',
    'ko',
    '[{"startMs":0,"endMs":8000,"text":"유튜브 알고리즘, 솔직히 모르시는 분 많죠?"},{"startMs":8000,"endMs":16000,"text":"저도 30일 실험 전까지는 CTR이 제자리였어요."},{"startMs":16000,"endMs":24000,"text":"오늘은 그 실험 데이터를 그대로 보여 드립니다."}]',
    '유튜브 알고리즘, 솔직히 모르시는 분 많죠? 저도 30일 실험 전까지는 CTR이 제자리였어요. 오늘은 그 실험 데이터를 그대로 보여 드립니다.'
  ),
  (
    'f1000000-0000-4000-8000-000000000002',
    's5-seed-video-02',
    'manual_upload',
    'available',
    'ko',
    '[{"startMs":0,"endMs":10000,"text":"쇼츠만 올렸는데 성장률이 87%까지 올랐습니다."},{"startMs":10000,"endMs":20000,"text":"비결은 길이가 아니라 훅 구조였어요."}]',
    '쇼츠만 올렸는데 성장률이 87%까지 올랐습니다. 비결은 길이가 아니라 훅 구조였어요.'
  ),
  (
    'f1000000-0000-4000-8000-000000000003',
    's5-seed-video-03',
    'manual_upload',
    'available',
    'ko',
    '[{"startMs":0,"endMs":12000,"text":"왜 아무도 이걸 말 안 해줬을까요?"},{"startMs":12000,"endMs":22000,"text":"답은 편집 템플릿에 있었습니다."}]',
    '왜 아무도 이걸 말 안 해줬을까요? 답은 편집 템플릿에 있었습니다.'
  ),
  (
    'f1000000-0000-4000-8000-000000000004',
    's5-seed-video-04',
    'manual_upload',
    'available',
    'ko',
    '[{"startMs":0,"endMs":15000,"text":"크리에이터들이 실제로 선택한 편집 템플릿을 모았습니다."}]',
    '크리에이터들이 실제로 선택한 편집 템플릿을 모았습니다.'
  ),
  (
    'f1000000-0000-4000-8000-000000000005',
    's5-seed-video-05',
    'manual_upload',
    'available',
    'ko',
    '[{"startMs":0,"endMs":9000,"text":"편집 전과 후, 차이가 이렇게 납니다."},{"startMs":9000,"endMs":18000,"text":"같은 영상도 훅만 바꿔도 유지율이 달라집니다."}]',
    '편집 전과 후, 차이가 이렇게 납니다. 같은 영상도 훅만 바꿔도 유지율이 달라집니다.'
  ),
  (
    'f1000000-0000-4000-8000-000000000006',
    's5-seed-video-06',
    'manual_upload',
    'available',
    'ko',
    '[{"startMs":0,"endMs":11000,"text":"30일 안에 썸네일 CTR을 마스터할 수 있을까요?"},{"startMs":11000,"endMs":20000,"text":"오늘은 단계별 체크리스트로 보여 드립니다."}]',
    '30일 안에 썸네일 CTR을 마스터할 수 있을까요? 오늘은 단계별 체크리스트로 보여 드립니다.'
  )
on conflict (video_id) do nothing;

insert into public.video_intro_segments (
  id,
  video_id,
  transcript_id,
  window_start_ms,
  window_end_ms,
  excerpt_text,
  structure_slots_json,
  source_mode,
  structure_extractor,
  lineage_snapshot
)
values
  (
    'g1000000-0000-4000-8000-000000000001',
    's5-seed-video-01',
    'f1000000-0000-4000-8000-000000000001',
    0,
    24000,
    '유튜브 알고리즘, 솔직히 모르시는 분 많죠? 저도 30일 실험 전까지는 CTR이 제자리였어요. 오늘은 그 실험 데이터를 그대로 보여 드립니다.',
    '{"situation":"유튜브 알고리즘, 솔직히 모르시는 분 많죠?","tension":"저도 30일 실험 전까지는 CTR이 제자리였어요.","promise":"오늘은 그 실험 데이터를 그대로 보여 드립니다."}',
    'imported_seed',
    'deterministic_v1',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S8 seed","keywordRank":1,"policyVersion":"youtube_score_v2","performanceGrade":"Great","contributionGrade":"Good","absoluteViewGrade":"Good","rankScore":12,"recommendationReason":"Seed intro evidence","poolSource":"keyword"}'
  ),
  (
    'g1000000-0000-4000-8000-000000000002',
    's5-seed-video-02',
    'f1000000-0000-4000-8000-000000000002',
    0,
    20000,
    '쇼츠만 올렸는데 성장률이 87%까지 올랐습니다. 비결은 길이가 아니라 훅 구조였어요.',
    '{"situation":"쇼츠만 올렸는데 성장률이 87%까지 올랐습니다.","surprisingClaim":"비결은 길이가 아니라 훅 구조였어요."}',
    'imported_seed',
    'deterministic_v1',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S8 seed","keywordRank":2,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Good","absoluteViewGrade":"Normal","rankScore":8,"recommendationReason":"Seed intro evidence","poolSource":"keyword"}'
  ),
  (
    'g1000000-0000-4000-8000-000000000003',
    's5-seed-video-03',
    'f1000000-0000-4000-8000-000000000003',
    0,
    22000,
    '왜 아무도 이걸 말 안 해줬을까요? 답은 편집 템플릿에 있었습니다.',
    '{"surprisingClaim":"왜 아무도 이걸 말 안 해줬을까요?","promise":"답은 편집 템플릿에 있었습니다."}',
    'imported_seed',
    'deterministic_v1',
    null
  ),
  (
    'g1000000-0000-4000-8000-000000000004',
    's5-seed-video-04',
    'f1000000-0000-4000-8000-000000000004',
    0,
    15000,
    '크리에이터들이 실제로 선택한 편집 템플릿을 모았습니다.',
    '{"credibilityProof":"크리에이터들이 실제로 선택한 편집 템플릿을 모았습니다."}',
    'imported_seed',
    'deterministic_v1',
    null
  ),
  (
    'g1000000-0000-4000-8000-000000000005',
    's5-seed-video-05',
    'f1000000-0000-4000-8000-000000000005',
    0,
    18000,
    '편집 전과 후, 차이가 이렇게 납니다. 같은 영상도 훅만 바꿔도 유지율이 달라집니다.',
    '{"situation":"편집 전과 후, 차이가 이렇게 납니다.","tension":"같은 영상도 훅만 바꿔도 유지율이 달라집니다."}',
    'imported_seed',
    'deterministic_v1',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S8 seed","keywordRank":3,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Good","absoluteViewGrade":"Good","rankScore":10,"recommendationReason":"Seed intro evidence","poolSource":"keyword"}'
  ),
  (
    'g1000000-0000-4000-8000-000000000006',
    's5-seed-video-06',
    'f1000000-0000-4000-8000-000000000006',
    0,
    20000,
    '30일 안에 썸네일 CTR을 마스터할 수 있을까요? 오늘은 단계별 체크리스트로 보여 드립니다.',
    '{"situation":"30일 안에 썸네일 CTR을 마스터할 수 있을까요?","promise":"오늘은 단계별 체크리스트로 보여 드립니다."}',
    'imported_seed',
    'deterministic_v1',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S8 seed","keywordRank":2,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Good","absoluteViewGrade":"Good","rankScore":9,"recommendationReason":"Seed intro evidence","poolSource":"keyword"}'
  )
on conflict (id) do nothing;

insert into public.creative_template_intro_evidence (template_id, intro_segment_id, sort_order)
select t.id, s.id, v.ord
from (values
  ('problem-tension-promise', 'g1000000-0000-4000-8000-000000000001', 0),
  ('surprise-credibility-bridge', 'g1000000-0000-4000-8000-000000000002', 0),
  ('story-situation-arc', 'g1000000-0000-4000-8000-000000000003', 0),
  ('credibility-promise', 'g1000000-0000-4000-8000-000000000004', 0),
  ('tutorial-fast-hook', 'g1000000-0000-4000-8000-000000000006', 0),
  ('full-six-slot', 'g1000000-0000-4000-8000-000000000005', 0)
) as v(tpl, sid, ord)
join public.creative_templates t on t.code = v.tpl
join public.video_intro_segments s on s.id = v.sid::uuid
on conflict do nothing;

insert into public.creative_template_intro_examples (
  template_id,
  label,
  filled_intro,
  slot_values_json,
  sort_order
)
select t.id, v.label, v.filled, v.slots::jsonb, v.ord
from (values
  (
    'problem-tension-promise',
    '알고리즘 실험',
    '【상황】\n유튜브 알고리즘, 솔직히 모르시는 분 많죠?\n\n【문제·갈등】\n저도 30일 실험 전까지는 CTR이 제자리였어요.\n\n【약속】\n오늘은 그 실험 데이터를 그대로 보여 드립니다.',
    '{"situation":"유튜브 알고리즘, 솔직히 모르시는 분 많죠?","tension":"저도 30일 실험 전까지는 CTR이 제자리였어요.","promise":"오늘은 그 실험 데이터를 그대로 보여 드립니다."}',
    0
  ),
  (
    'tutorial-fast-hook',
    'CTR 마스터',
    '【상황】\n30일 안에 썸네일 CTR을 마스터할 수 있을까요?\n\n【약속】\n오늘은 단계별 체크리스트로 보여 드립니다.',
    '{"situation":"30일 안에 썸네일 CTR을 마스터할 수 있을까요?","promise":"오늘은 단계별 체크리스트로 보여 드립니다."}',
    0
  )
) as v(tpl, label, filled, slots, ord)
join public.creative_templates t on t.code = v.tpl
on conflict do nothing;
