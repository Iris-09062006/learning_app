create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(50) not null,
  role public.user_role not null default 'learner',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length
    check (char_length(trim(username)) between 3 and 50)
);
