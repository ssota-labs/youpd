-- S7: Title evidence + copy template library.

create table if not exists public.video_title_analyses (
  id uuid primary key default gen_random_uuid(),
  video_id text not null references public.youtube_videos (video_id) on delete cascade,
  source_folder_video_id uuid references public.reference_folder_videos (id) on delete set null,
  source_title text not null,
  parsed_title text not null,
  observed_axes_json jsonb not null,
  lineage_snapshot jsonb,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (video_id)
);

alter table public.video_title_analyses enable row level security;
drop policy if exists "deny_all" on public.video_title_analyses;
create policy "deny_all"
  on public.video_title_analyses
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_copy_examples (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  label text not null,
  filled_title text not null,
  slot_values_json jsonb not null,
  sort_order int not null default 0
);

alter table public.creative_template_copy_examples enable row level security;
drop policy if exists "deny_all" on public.creative_template_copy_examples;
create policy "deny_all"
  on public.creative_template_copy_examples
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_title_evidence (
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  title_analysis_id uuid not null references public.video_title_analyses (id) on delete cascade,
  evidence_note text,
  sort_order int not null default 0,
  unique (template_id, title_analysis_id)
);

alter table public.creative_template_title_evidence enable row level security;
drop policy if exists "deny_all" on public.creative_template_title_evidence;
create policy "deny_all"
  on public.creative_template_title_evidence
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.copy_template_thumbnail_links (
  copy_template_id uuid not null references public.creative_templates (id) on delete cascade,
  thumbnail_template_id uuid not null references public.creative_templates (id) on delete cascade,
  pairing_rationale text,
  sort_order int not null default 0,
  unique (copy_template_id, thumbnail_template_id)
);

alter table public.copy_template_thumbnail_links enable row level security;
drop policy if exists "deny_all" on public.copy_template_thumbnail_links;
create policy "deny_all"
  on public.copy_template_thumbnail_links
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Copy browse categories (shared taxonomy table).
insert into public.creative_template_categories (id, code, name, description, sort_order)
values
  ('a2000000-0000-4000-8000-000000000001', 'curiosity-gap', '호기심 갭', '궁금증을 남기는 제목 구조', 10),
  ('a2000000-0000-4000-8000-000000000002', 'specificity', '구체성', '숫자·고유명사로 신뢰를 높이는 패턴', 11),
  ('a2000000-0000-4000-8000-000000000003', 'social-proof', '사회적 증거', '다수·권위를 인용하는 패턴', 12),
  ('a2000000-0000-4000-8000-000000000004', 'how-to-promise', '방법 약속', '학습·달성 약속형 제목', 13),
  ('a2000000-0000-4000-8000-000000000005', 'controversy', '논쟁·반전', '대립·경고 톤의 제목', 14),
  ('a2000000-0000-4000-8000-000000000006', 'listicle', '리스트형', '목록·순위형 제목', 15)
on conflict (code) do nothing;

insert into public.creative_template_tags (id, code, name, kind)
values
  ('b2000000-0000-4000-8000-000000000001', 'number-in-title', '제목 숫자', 'technique'),
  ('b2000000-0000-4000-8000-000000000002', 'parenthetical', '괄호 보조', 'technique'),
  ('b2000000-0000-4000-8000-000000000003', 'question-mark', '물음표', 'technique'),
  ('b2000000-0000-4000-8000-000000000004', 'colon-structure', '콜론 2단', 'technique'),
  ('b2000000-0000-4000-8000-000000000005', 'emoji-free', '이모지 없음', 'technique')
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
    'd1000000-0000-4000-8000-000000000001',
    'copy',
    'curiosity-gap-colon',
    '호기심 갭 · 콜론 2단',
    '주제와 약속을 콜론으로 나누고 괄호로 증거를 덧붙입니다.',
    '핵심 질문을 던지기 전에 주제를 명확히 할 때',
    '{"version":1,"pattern":"{{topic}}: {{promise}} ({{proof}})","locale":"ko"}',
    '{"version":1,"slots":[{"key":"topic","label":"주제","type":"text","required":true},{"key":"promise","label":"약속","type":"text","required":true},{"key":"proof","label":"증거","type":"text","required":true}]}',
    '',
    '{"hookType":"curiosity_gap","titleShape":"colon_two_part","tones":["authoritative"],"rationale":"콜론 앞뒤로 정보 계층을 만듭니다."}',
    'published'
  ),
  (
    'd1000000-0000-4000-8000-000000000002',
    'copy',
    'numeric-emphasis-title',
    '숫자 강조 · 성과 약속',
    '큰 숫자와 결과를 앞에 배치합니다.',
    '수치·퍼센트·기간이 강점일 때',
    '{"version":1,"pattern":"{{number}}% {{outcome}} — {{topic}}","locale":"ko"}',
    '{"version":1,"slots":[{"key":"number","label":"숫자","type":"number","required":true},{"key":"outcome","label":"결과","type":"text","required":true},{"key":"topic","label":"주제","type":"text","required":true}]}',
    '',
    '{"hookType":"numeric_emphasis","titleShape":"short_label","tones":["urgent"],"rationale":"숫자가 시선을 먼저 잡습니다."}',
    'published'
  ),
  (
    'd1000000-0000-4000-8000-000000000003',
    'copy',
    'question-hook-direct',
    '질문형 훅',
    '한 문장 질문으로 클릭을 유도합니다.',
    '시청자가 스스로 답을 찾게 만들 때',
    '{"version":1,"pattern":"{{question}}?","locale":"ko"}',
    '{"version":1,"slots":[{"key":"question","label":"질문","type":"text","required":true}]}',
    '',
    '{"hookType":"question","titleShape":"conversational","tones":["playful"],"rationale":"질문은 참여를 유도합니다."}',
    'published'
  ),
  (
    'd1000000-0000-4000-8000-000000000004',
    'copy',
    'social-proof-audience',
    '사회적 증거 · 집단',
    '특정 집단이 선택했다는 프레이밍을 씁니다.',
    '커뮤니티·트렌드·검증된 선택을 강조할 때',
    '{"version":1,"pattern":"{{audience}}이 선택한 {{topic}}","locale":"ko"}',
    '{"version":1,"slots":[{"key":"audience","label":"집단","type":"text","required":true},{"key":"topic","label":"주제","type":"text","required":true}]}',
    '',
    '{"hookType":"social_proof","titleShape":"short_label","tones":["authoritative"],"rationale":"집단 신뢰를 빌려옵니다."}',
    'published'
  ),
  (
    'd1000000-0000-4000-8000-000000000005',
    'copy',
    'contrast-before-after',
    '대비 · Before/After',
    '대립되는 두 상태를 나란히 제시합니다.',
    '변화·실험·비교 콘텐츠일 때',
    '{"version":1,"pattern":"{{before}} vs {{after}}","locale":"ko"}',
    '{"version":1,"slots":[{"key":"before","label":"Before","type":"text","required":true},{"key":"after","label":"After","type":"text","required":true}]}',
    '',
    '{"hookType":"contrast","titleShape":"list_enumeration","tones":["contrarian"],"rationale":"대비가 긴장을 만듭니다."}',
    'published'
  ),
  (
    'd1000000-0000-4000-8000-000000000006',
    'copy',
    'how-to-promise-timebox',
    '방법 약속 · 기한',
    '기한 안에 달성을 약속합니다.',
    '튜토리얼·교육·스킬업 주제일 때',
    '{"version":1,"pattern":"{{timeframe}} 안에 {{skill}} 마스터하기","locale":"ko"}',
    '{"version":1,"slots":[{"key":"timeframe","label":"기한","type":"text","required":true},{"key":"skill","label":"스킬","type":"text","required":true}]}',
    '',
    '{"hookType":"how_to_promise","titleShape":"short_label","tones":["educational"],"rationale":"기한이 실행 가능성을 높입니다."}',
    'published'
  )
on conflict (code) do nothing;

insert into public.creative_template_category_links (template_id, category_id)
select t.id, c.id
from (values
  ('curiosity-gap-colon', 'curiosity-gap'),
  ('numeric-emphasis-title', 'specificity'),
  ('question-hook-direct', 'curiosity-gap'),
  ('social-proof-audience', 'social-proof'),
  ('contrast-before-after', 'contrast'),
  ('how-to-promise-timebox', 'how-to-promise')
) as v(tpl, cat)
join public.creative_templates t on t.code = v.tpl
join public.creative_template_categories c on c.code = v.cat
on conflict do nothing;

insert into public.creative_template_tag_links (template_id, tag_id)
select t.id, g.id
from (values
  ('curiosity-gap-colon', 'colon-structure'),
  ('curiosity-gap-colon', 'parenthetical'),
  ('numeric-emphasis-title', 'number-in-title'),
  ('question-hook-direct', 'question-mark'),
  ('social-proof-audience', 'emoji-free'),
  ('contrast-before-after', 'emoji-free'),
  ('how-to-promise-timebox', 'emoji-free')
) as v(tpl, tag)
join public.creative_templates t on t.code = v.tpl
join public.creative_template_tags g on g.code = v.tag
on conflict do nothing;

insert into public.video_title_analyses (
  id,
  video_id,
  source_title,
  parsed_title,
  observed_axes_json,
  lineage_snapshot,
  analyzed_at
)
values
  (
    'e1000000-0000-4000-8000-000000000001',
    's5-seed-video-01',
    '이 방법 모르면 손해: 유튜브 알고리즘 (실험 결과)',
    '이 방법 모르면 손해: 유튜브 알고리즘 (실험 결과)',
    '{"hookType":"curiosity_gap","titleShape":"colon_two_part","tones":["authoritative"],"specificity":"high"}',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S7 seed","keywordRank":1,"policyVersion":"youtube_score_v2","performanceGrade":"Great","contributionGrade":"Good","absoluteViewGrade":"Good","rankScore":12,"recommendationReason":"Seed title evidence","poolSource":"keyword"}',
    now()
  ),
  (
    'e1000000-0000-4000-8000-000000000002',
    's5-seed-video-02',
    '87% 성장률 — 쇼츠 전략',
    '87% 성장률 — 쇼츠 전략',
    '{"hookType":"numeric_emphasis","titleShape":"short_label","tones":["urgent"],"specificity":"high"}',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S7 seed","keywordRank":2,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Good","absoluteViewGrade":"Normal","rankScore":8,"recommendationReason":"Seed title evidence","poolSource":"keyword"}',
    now()
  ),
  (
    'e1000000-0000-4000-8000-000000000003',
    's5-seed-video-03',
    '왜 아무도 이걸 말 안 해줬을까?',
    '왜 아무도 이걸 말 안 해줬을까?',
    '{"hookType":"question","titleShape":"conversational","tones":["playful"]}',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S7 seed","keywordRank":1,"policyVersion":"youtube_score_v2","performanceGrade":"Great","contributionGrade":"Great","absoluteViewGrade":"Good","rankScore":20,"recommendationReason":"Seed title evidence","poolSource":"keyword"}',
    now()
  ),
  (
    'e1000000-0000-4000-8000-000000000004',
    's5-seed-video-04',
    '크리에이터들이 선택한 편집 템플릿',
    '크리에이터들이 선택한 편집 템플릿',
    '{"hookType":"social_proof","titleShape":"short_label","tones":["authoritative"]}',
    null,
    now()
  ),
  (
    'e1000000-0000-4000-8000-000000000005',
    's5-seed-video-05',
    '편집 전 vs 편집 후',
    '편집 전 vs 편집 후',
    '{"hookType":"contrast","titleShape":"list_enumeration","tones":["contrarian"],"specificity":"medium"}',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S7 seed","keywordRank":3,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Good","absoluteViewGrade":"Good","rankScore":10,"recommendationReason":"Seed title evidence","poolSource":"keyword"}',
    now()
  ),
  (
    'e1000000-0000-4000-8000-000000000006',
    's5-seed-video-06',
    '30일 안에 썸네일 CTR 마스터하기',
    '30일 안에 썸네일 CTR 마스터하기',
    '{"hookType":"how_to_promise","titleShape":"short_label","tones":["educational"],"specificity":"high"}',
    '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S7 seed","keywordRank":2,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Good","absoluteViewGrade":"Good","rankScore":9,"recommendationReason":"Seed title evidence","poolSource":"keyword"}',
    now()
  )
on conflict (video_id) do nothing;

insert into public.creative_template_title_evidence (template_id, title_analysis_id, sort_order)
select t.id, a.id, v.ord
from (values
  ('curiosity-gap-colon', 'e1000000-0000-4000-8000-000000000001', 0),
  ('numeric-emphasis-title', 'e1000000-0000-4000-8000-000000000002', 0),
  ('question-hook-direct', 'e1000000-0000-4000-8000-000000000003', 0),
  ('social-proof-audience', 'e1000000-0000-4000-8000-000000000004', 0),
  ('contrast-before-after', 'e1000000-0000-4000-8000-000000000005', 0),
  ('how-to-promise-timebox', 'e1000000-0000-4000-8000-000000000006', 0)
) as v(tpl, aid, ord)
join public.creative_templates t on t.code = v.tpl
join public.video_title_analyses a on a.id = v.aid::uuid
on conflict do nothing;

insert into public.creative_template_copy_examples (
  template_id,
  label,
  filled_title,
  slot_values_json,
  sort_order
)
select t.id, v.label, v.filled, v.slots::jsonb, v.ord
from (values
  (
    'curiosity-gap-colon',
    '알고리즘 실험',
    '유튜브 알고리즘: 30일 실험 결과 (CTR +42%)',
    '{"topic":"유튜브 알고리즘","promise":"30일 실험 결과","proof":"CTR +42%"}',
    0
  ),
  (
    'numeric-emphasis-title',
    '성장률',
    '87% 성장률 — 쇼츠 전략',
    '{"number":"87","outcome":"성장률","topic":"쇼츠 전략"}',
    0
  ),
  (
    'question-hook-direct',
    '비밀',
    '왜 아무도 이걸 말 안 해줬을까?',
    '{"question":"왜 아무도 이걸 말 안 해줬을까"}',
    0
  )
) as v(tpl, label, filled, slots, ord)
join public.creative_templates t on t.code = v.tpl
on conflict do nothing;

insert into public.copy_template_thumbnail_links (
  copy_template_id,
  thumbnail_template_id,
  pairing_rationale,
  sort_order
)
select c.id, th.id, v.rationale, v.ord
from (values
  ('curiosity-gap-colon', 'high-contrast-headline', '고대비 헤드라인과 콜론 카피가 잘 맞습니다.', 0),
  ('numeric-emphasis-title', 'numeric-proof', '숫자 강조 썸네일·제목 쌍', 0),
  ('question-hook-direct', 'face-emotion-closeup', '질문형 제목 + 표정 클로즈업', 0),
  ('contrast-before-after', 'before-after-split', '비포·애프터 분할 썸네일', 0),
  ('how-to-promise-timebox', 'minimal-typography', '미니멀 타이포 + 교육 약속', 0)
) as v(copy_code, thumb_code, rationale, ord)
join public.creative_templates c on c.code = v.copy_code
join public.creative_templates th on th.code = v.thumb_code
on conflict do nothing;
