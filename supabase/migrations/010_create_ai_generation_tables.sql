-- Create enums for generated exercises and review status if not existing
do $$ begin
  create type public.generated_exercise_status as enum ('pending', 'approved', 'rejected', 'needs_revision', 'published');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.review_status as enum ('approved', 'rejected', 'needs_revision');
exception
  when duplicate_object then null;
end $$;

-- Create generated_exercises table
create table if not exists public.generated_exercises (
  id bigint generated always as identity primary key,
  lesson_id bigint not null references public.lessons(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  title varchar(150) not null,
  description text,
  exercise_type public.exercise_type not null,
  difficulty public.difficulty_level not null,
  content jsonb not null,
  status public.generated_exercise_status not null default 'pending',
  provider varchar(50) not null,
  model varchar(100),
  published_exercise_id bigint references public.exercises(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_exercises_published_exercise_id_key unique (published_exercise_id)
);

create index if not exists idx_generated_exercises_status_created on public.generated_exercises(status, created_at);
create index if not exists idx_generated_exercises_lesson_id on public.generated_exercises(lesson_id);

-- Create exercise_reviews table
create table if not exists public.exercise_reviews (
  id bigint generated always as identity primary key,
  generated_exercise_id bigint not null references public.generated_exercises(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  status public.review_status not null,
  comment text,
  edited_snapshot jsonb,
  reviewed_at timestamptz not null default now()
);

create index if not exists idx_exercise_reviews_generated_id on public.exercise_reviews(generated_exercise_id, reviewed_at desc);

-- Enable RLS
alter table public.generated_exercises enable row level security;
alter table public.exercise_reviews enable row level security;

-- RLS Policies for generated_exercises (Moderator / Admin access only)
create policy "Moderators and admins can view generated exercises"
  on public.generated_exercises for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('moderator', 'admin')
    )
  );

create policy "Moderators and admins can insert generated exercises"
  on public.generated_exercises for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('moderator', 'admin')
    )
  );

create policy "Moderators and admins can update generated exercises"
  on public.generated_exercises for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('moderator', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('moderator', 'admin')
    )
  );

-- RLS Policies for exercise_reviews (Moderator / Admin access only)
create policy "Moderators and admins can view exercise reviews"
  on public.exercise_reviews for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('moderator', 'admin')
    )
  );

create policy "Moderators and admins can insert exercise reviews"
  on public.exercise_reviews for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('moderator', 'admin')
    )
  );
