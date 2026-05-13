insert into public.health_checks (key, value)
values ('liveness', 'ok')
on conflict (key) do nothing;
