insert into public.health_checks (key, value)
values ('liveness', 'ok')
on conflict (key) do nothing;

-- E2E / integration stub user (matches YOUPD_E2E_SKIP_AUTH in apps/web)
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
  '00000000-0000-4000-8000-00000000e2e0',
  'authenticated',
  'authenticated',
  'e2e@youpd.local',
  crypt('e2e-test-password-16chars', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;
