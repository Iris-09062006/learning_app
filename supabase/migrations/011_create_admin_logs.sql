create table if not exists public.admin_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action varchar(100) not null,
  target_type varchar(100) not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint check_action_length check (char_length(trim(action)) between 1 and 100),
  constraint check_target_type_length check (char_length(trim(target_type)) between 1 and 100),
  constraint check_target_id_length check (char_length(trim(target_id)) between 1 and 200)
);