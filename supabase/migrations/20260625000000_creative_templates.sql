-- S5: Thumbnail Template Library (creative_templates catalog).

create table if not exists public.creative_template_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.creative_template_categories enable row level security;
drop policy if exists "deny_all" on public.creative_template_categories;
create policy "deny_all"
  on public.creative_template_categories
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_tags (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null default 'technique',
  created_at timestamptz not null default now()
);

alter table public.creative_template_tags enable row level security;
drop policy if exists "deny_all" on public.creative_template_tags;
create policy "deny_all"
  on public.creative_template_tags
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  code text not null unique,
  name text not null,
  summary text not null,
  use_when text not null,
  skeleton_json jsonb not null,
  slot_schema_json jsonb not null,
  prompt_scaffold text not null,
  default_style_json jsonb not null,
  preview_image_url text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_templates_kind_status_updated_idx
  on public.creative_templates (kind, status, updated_at desc);

alter table public.creative_templates enable row level security;
drop policy if exists "deny_all" on public.creative_templates;
create policy "deny_all"
  on public.creative_templates
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_category_links (
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  category_id uuid not null references public.creative_template_categories (id) on delete cascade,
  unique (template_id, category_id)
);

alter table public.creative_template_category_links enable row level security;
drop policy if exists "deny_all" on public.creative_template_category_links;
create policy "deny_all"
  on public.creative_template_category_links
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_tag_links (
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  tag_id uuid not null references public.creative_template_tags (id) on delete cascade,
  unique (template_id, tag_id)
);

alter table public.creative_template_tag_links enable row level security;
drop policy if exists "deny_all" on public.creative_template_tag_links;
create policy "deny_all"
  on public.creative_template_tag_links
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.creative_template_reference_videos (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  video_id text not null references public.youtube_videos (video_id) on delete cascade,
  source_folder_video_id uuid references public.reference_folder_videos (id) on delete set null,
  evidence_note text,
  observed_axes_json jsonb not null,
  lineage_snapshot jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (template_id, video_id)
);

alter table public.creative_template_reference_videos enable row level security;
drop policy if exists "deny_all" on public.creative_template_reference_videos;
create policy "deny_all"
  on public.creative_template_reference_videos
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Seed channel + videos for S5 catalog references (idempotent).
insert into public.youtube_channels (channel_id, title, subscriber_count, average_view_count, url)
values (
  'UC-s5-template-seed',
  'S5 Template Seed Channel',
  100000,
  50000,
  'https://www.youtube.com/channel/UC-s5-template-seed'
)
on conflict (channel_id) do nothing;

insert into public.youtube_videos (
  video_id,
  channel_id,
  title,
  thumbnail_url,
  video_url,
  view_count,
  duration_sec,
  is_short
)
values
  (
    's5-seed-video-01',
    'UC-s5-template-seed',
    'S5 대비 강조 썸네일 레퍼런스',
    'https://i.ytimg.com/vi/s5-seed-video-01/hqdefault.jpg',
    'https://www.youtube.com/watch?v=s5-seed-video-01',
    120000,
    600,
    false
  ),
  (
    's5-seed-video-02',
    'UC-s5-template-seed',
    'S5 숫자 강조 썸네일 레퍼런스',
    'https://i.ytimg.com/vi/s5-seed-video-02/hqdefault.jpg',
    'https://www.youtube.com/watch?v=s5-seed-video-02',
    98000,
    480,
    false
  ),
  (
    's5-seed-video-03',
    'UC-s5-template-seed',
    'S5 얼굴 감정 썸네일 레퍼런스',
    'https://i.ytimg.com/vi/s5-seed-video-03/hqdefault.jpg',
    'https://www.youtube.com/watch?v=s5-seed-video-03',
    210000,
    720,
    false
  ),
  (
    's5-seed-video-04',
    'UC-s5-template-seed',
    'S5 미니멀 타이포 썸네일 레퍼런스',
    'https://i.ytimg.com/vi/s5-seed-video-04/hqdefault.jpg',
    'https://www.youtube.com/watch?v=s5-seed-video-04',
    76000,
    540,
    false
  ),
  (
    's5-seed-video-05',
    'UC-s5-template-seed',
    'S5 비포애프터 썸네일 레퍼런스',
    'https://i.ytimg.com/vi/s5-seed-video-05/hqdefault.jpg',
    'https://www.youtube.com/watch?v=s5-seed-video-05',
    145000,
    660,
    false
  ),
  (
    's5-seed-video-06',
    'UC-s5-template-seed',
    'S5 차트 썸네일 레퍼런스',
    'https://i.ytimg.com/vi/s5-seed-video-06/hqdefault.jpg',
    'https://www.youtube.com/watch?v=s5-seed-video-06',
    88000,
    420,
    false
  )
on conflict (video_id) do nothing;

insert into public.creative_template_categories (id, code, name, description, sort_order)
values
  ('a1000000-0000-4000-8000-000000000001', 'contrast', '대비 강조', '색·밝기 대비로 시선을 끄는 패턴', 1),
  ('a1000000-0000-4000-8000-000000000002', 'numeric-emphasis', '숫자 강조', '수치·퍼센트로 클릭을 유도', 2),
  ('a1000000-0000-4000-8000-000000000003', 'face-emotion', '얼굴·감정', '표정 중심 썸네일', 3)
on conflict (code) do nothing;

insert into public.creative_template_tags (id, code, name, kind)
values
  ('b1000000-0000-4000-8000-000000000001', 'split-screen', '분할 화면', 'technique'),
  ('b1000000-0000-4000-8000-000000000002', 'red-accent', '레드 포인트', 'technique'),
  ('b1000000-0000-4000-8000-000000000003', 'no-face', '얼굴 없음', 'technique'),
  ('b1000000-0000-4000-8000-000000000004', 'korean-copy-heavy', '한글 카피 중심', 'technique'),
  ('b1000000-0000-4000-8000-000000000005', 'arrow', '화살표', 'technique'),
  ('b1000000-0000-4000-8000-000000000006', 'chart-overlay', '차트 오버레이', 'technique'),
  ('b1000000-0000-4000-8000-000000000007', 'before-after', '비포·애프터', 'technique'),
  ('b1000000-0000-4000-8000-000000000008', 'minimal-type', '미니멀 타이포', 'technique')
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
    'c1000000-0000-4000-8000-000000000001',
    'thumbnail',
    'high-contrast-headline',
    '고대비 헤드라인',
    '배경과 텍스트 대비로 한 문장을 강조합니다.',
    '정보가 많은 주제에서 핵심 메시지 하나만 전달할 때',
    '{"version":1,"aspect":"16:9","regions":[{"id":"bg","role":"background","box":{"x":0,"y":0,"w":1,"h":1}},{"id":"headline","role":"text_primary","box":{"x":0.08,"y":0.2,"w":0.84,"h":0.35},"bindsSlot":"headline"}]}',
    '{"version":1,"slots":[{"key":"headline","label":"헤드라인","type":"text","required":true,"description":"12자 이내 권장"}]}',
    'Create a YouTube thumbnail with strong contrast. Headline: {{headline}}.',
    '{"accent":"#E11D48","typography":"bold-sans"}',
    'published'
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'thumbnail',
    'numeric-proof',
    '숫자 증거형',
    '큰 숫자와 짧은 보조 카피로 신뢰를 만듭니다.',
    '성과·비교·전후 수치가 있을 때',
    '{"version":1,"aspect":"16:9","regions":[{"id":"number","role":"badge","box":{"x":0.1,"y":0.15,"w":0.35,"h":0.4},"bindsSlot":"metric"},{"id":"sub","role":"text_secondary","box":{"x":0.5,"y":0.25,"w":0.4,"h":0.3},"bindsSlot":"caption"}]}',
    '{"version":1,"slots":[{"key":"metric","label":"핵심 숫자","type":"number","required":true},{"key":"caption","label":"보조 문구","type":"text","required":true}]}',
    'Thumbnail with dominant number {{metric}} and caption {{caption}}.',
    '{"accent":"#F59E0B"}',
    'published'
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    'thumbnail',
    'face-emotion-closeup',
    '얼굴 클로즈업 감정',
    '인물 표정으로 감정을 전달합니다.',
    '리액션·스토리·브이로그 톤일 때',
    '{"version":1,"aspect":"16:9","regions":[{"id":"face","role":"subject","box":{"x":0.55,"y":0.1,"w":0.4,"h":0.8},"bindsSlot":"person"},{"id":"hook","role":"text_primary","box":{"x":0.05,"y":0.2,"w":0.45,"h":0.25},"bindsSlot":"hook"}]}',
    '{"version":1,"slots":[{"key":"person","label":"인물","type":"person","required":true},{"key":"hook","label":"훅 문구","type":"text","required":true}]}',
    'Close-up face thumbnail. Person: {{person}}. Hook: {{hook}}.',
    '{"emotion":"surprise"}',
    'published'
  ),
  (
    'c1000000-0000-4000-8000-000000000004',
    'thumbnail',
    'minimal-typography',
    '미니멀 타이포',
    '여백과 짧은 타이포만 사용합니다.',
    '차분한 정보·교육 콘텐츠일 때',
    '{"version":1,"aspect":"16:9","regions":[{"id":"title","role":"text_primary","box":{"x":0.12,"y":0.35,"w":0.76,"h":0.3},"bindsSlot":"title"}]}',
    '{"version":1,"slots":[{"key":"title","label":"제목","type":"text","required":true}]}',
    'Minimal typography thumbnail: {{title}}.',
    '{"palette":"mono"}',
    'published'
  ),
  (
    'c1000000-0000-4000-8000-000000000005',
    'thumbnail',
    'before-after-split',
    '비포·애프터 분할',
    '좌우 분할로 변화를 보여줍니다.',
    '전후 비교·변신·실험 결과일 때',
    '{"version":1,"aspect":"16:9","regions":[{"id":"before","role":"subject","box":{"x":0,"y":0,"w":0.48,"h":1},"bindsSlot":"beforeLabel"},{"id":"after","role":"subject","box":{"x":0.52,"y":0,"w":0.48,"h":1},"bindsSlot":"afterLabel"}]}',
    '{"version":1,"slots":[{"key":"beforeLabel","label":"Before 라벨","type":"text","required":true},{"key":"afterLabel","label":"After 라벨","type":"text","required":true}]}',
    'Split before/after thumbnail. Before {{beforeLabel}}, After {{afterLabel}}.',
    '{"layout":"split"}',
    'published'
  ),
  (
    'c1000000-0000-4000-8000-000000000006',
    'thumbnail',
    'chart-highlight',
    '차트 하이라이트',
    '차트 영역과 한 줄 카피를 조합합니다.',
    '데이터·트렌드·투자·성장 주제일 때',
    '{"version":1,"aspect":"16:9","regions":[{"id":"chart","role":"chart","box":{"x":0.1,"y":0.2,"w":0.55,"h":0.6},"bindsSlot":"chartData"},{"id":"label","role":"text_primary","box":{"x":0.68,"y":0.25,"w":0.25,"h":0.35},"bindsSlot":"insight"}]}',
    '{"version":1,"slots":[{"key":"chartData","label":"차트 데이터","type":"chart_data","required":true},{"key":"insight","label":"인사이트","type":"text","required":true}]}',
    'Chart thumbnail. Insight: {{insight}}.',
    '{"style":"line-chart"}',
    'published'
  )
on conflict (code) do nothing;

insert into public.creative_template_category_links (template_id, category_id)
select t.id, c.id
from (values
  ('high-contrast-headline', 'contrast'),
  ('numeric-proof', 'numeric-emphasis'),
  ('face-emotion-closeup', 'face-emotion'),
  ('minimal-typography', 'contrast'),
  ('before-after-split', 'contrast'),
  ('chart-highlight', 'numeric-emphasis')
) as v(tpl, cat)
join public.creative_templates t on t.code = v.tpl
join public.creative_template_categories c on c.code = v.cat
on conflict do nothing;

insert into public.creative_template_tag_links (template_id, tag_id)
select t.id, g.id
from (values
  ('high-contrast-headline', 'red-accent'),
  ('high-contrast-headline', 'korean-copy-heavy'),
  ('numeric-proof', 'arrow'),
  ('face-emotion-closeup', 'korean-copy-heavy'),
  ('minimal-typography', 'minimal-type'),
  ('minimal-typography', 'no-face'),
  ('before-after-split', 'before-after'),
  ('before-after-split', 'split-screen'),
  ('chart-highlight', 'chart-overlay')
) as v(tpl, tag)
join public.creative_templates t on t.code = v.tpl
join public.creative_template_tags g on g.code = v.tag
on conflict do nothing;

insert into public.creative_template_reference_videos (
  template_id,
  video_id,
  observed_axes_json,
  lineage_snapshot,
  sort_order
)
select
  t.id,
  v.vid,
  v.axes::jsonb,
  v.lineage::jsonb,
  v.ord
from public.creative_templates t
join (
  values
    (
      'high-contrast-headline',
      's5-seed-video-01',
      '{"visualHierarchy":"high","textDensity":"medium","titleThumbnailAlignment":"strong"}',
      '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S5 seed","keywordRank":1,"policyVersion":"youtube_score_v2","performanceGrade":"Great","contributionGrade":"Good","absoluteViewGrade":"Good","rankScore":12,"recommendationReason":"Seed evidence","poolSource":"keyword"}',
      0
    ),
    (
      'numeric-proof',
      's5-seed-video-02',
      '{"textDensity":"high","titleThumbnailAlignment":"moderate"}',
      '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S5 seed","keywordRank":2,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Good","absoluteViewGrade":"Normal","rankScore":8,"recommendationReason":"Seed evidence","poolSource":"keyword"}',
      0
    ),
    (
      'face-emotion-closeup',
      's5-seed-video-03',
      '{"faceTreatment":"dominant","thumbnailEmotion":"surprise"}',
      '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S5 seed","keywordRank":1,"policyVersion":"youtube_score_v2","performanceGrade":"Great","contributionGrade":"Great","absoluteViewGrade":"Good","rankScore":20,"recommendationReason":"Seed evidence","poolSource":"keyword"}',
      0
    ),
    (
      'minimal-typography',
      's5-seed-video-04',
      '{"textDensity":"low","visualHierarchy":"medium"}',
      null,
      0
    ),
    (
      'before-after-split',
      's5-seed-video-05',
      '{"visualHierarchy":"high","titleThumbnailAlignment":"strong"}',
      '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S5 seed","keywordRank":3,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Good","absoluteViewGrade":"Good","rankScore":10,"recommendationReason":"Seed evidence","poolSource":"keyword"}',
      0
    ),
    (
      'chart-highlight',
      's5-seed-video-06',
      '{"textDensity":"medium","visualHierarchy":"high"}',
      '{"sourceHarvestId":"00000000-0000-4000-8000-000000000099","sourceKeyword":"S5 seed","keywordRank":4,"policyVersion":"youtube_score_v2","performanceGrade":"Good","contributionGrade":"Normal","absoluteViewGrade":"Normal","rankScore":6,"recommendationReason":"Seed evidence","poolSource":"keyword"}',
      0
    )
) as v(tpl, vid, axes, lineage, ord) on t.code = v.tpl
on conflict do nothing;
