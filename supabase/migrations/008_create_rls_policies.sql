create or replace function public.has_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = required_role
      and is_active = true
  );
$$;

revoke all on function public.has_role(public.user_role) from public;
grant execute on function public.has_role(public.user_role) to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_options enable row level security;
alter table public.exercise_solutions enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.user_progress enable row level security;
alter table public.submissions enable row level security;
alter table public.ai_explanations enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (username) on table public.profiles to authenticated;

revoke all on table public.courses from anon, authenticated;
revoke all on table public.chapters from anon, authenticated;
revoke all on table public.lessons from anon, authenticated;
revoke all on table public.exercises from anon, authenticated;
revoke all on table public.exercise_options from anon, authenticated;
grant select on table public.courses to anon, authenticated;
grant select on table public.chapters to anon, authenticated;
grant select on table public.lessons to anon, authenticated;
grant select on table public.exercises to anon, authenticated;
grant select on table public.exercise_options to anon, authenticated;

revoke all on table public.exercise_solutions from anon, authenticated;

revoke all on table public.course_enrollments from anon, authenticated;
revoke all on table public.user_progress from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.ai_explanations from anon, authenticated;
grant select on table public.course_enrollments to authenticated;
grant select on table public.user_progress to authenticated;
grant select on table public.submissions to authenticated;
grant select on table public.ai_explanations to authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Users can update own username" on public.profiles;
create policy "Users can update own username" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Published courses are public" on public.courses;
create policy "Published courses are public" on public.courses
  for select to anon, authenticated using (is_published = true);

drop policy if exists "Published chapters are public" on public.chapters;
create policy "Published chapters are public" on public.chapters
  for select to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.courses
      where courses.id = chapters.course_id
        and courses.is_published = true
    )
  );

drop policy if exists "Published lessons are public" on public.lessons;
create policy "Published lessons are public" on public.lessons
  for select to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.chapters
      join public.courses on courses.id = chapters.course_id
      where chapters.id = lessons.chapter_id
        and chapters.is_published = true
        and courses.is_published = true
    )
  );

drop policy if exists "Published exercises are public" on public.exercises;
create policy "Published exercises are public" on public.exercises
  for select to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.lessons
      join public.chapters on chapters.id = lessons.chapter_id
      join public.courses on courses.id = chapters.course_id
      where lessons.id = exercises.lesson_id
        and lessons.is_published = true
        and chapters.is_published = true
        and courses.is_published = true
    )
  );

drop policy if exists "Published exercise options are public" on public.exercise_options;
create policy "Published exercise options are public" on public.exercise_options
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.exercises
      join public.lessons on lessons.id = exercises.lesson_id
      join public.chapters on chapters.id = lessons.chapter_id
      join public.courses on courses.id = chapters.course_id
      where exercises.id = exercise_options.exercise_id
        and exercises.is_published = true
        and lessons.is_published = true
        and chapters.is_published = true
        and courses.is_published = true
    )
  );

drop policy if exists "Learners can view own enrollments" on public.course_enrollments;
create policy "Learners can view own enrollments" on public.course_enrollments
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Learners can view own progress" on public.user_progress;
create policy "Learners can view own progress" on public.user_progress
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Learners can view own submissions" on public.submissions;
create policy "Learners can view own submissions" on public.submissions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Learners can view own AI explanations" on public.ai_explanations;
create policy "Learners can view own AI explanations" on public.ai_explanations
  for select to authenticated
  using (
    exists (
      select 1 from public.submissions
      where submissions.id = ai_explanations.submission_id
        and submissions.user_id = auth.uid()
    )
  );
