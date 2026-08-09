create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text := trim(new.raw_user_meta_data ->> 'username');
  resolved_username text;
begin
  if char_length(requested_username) between 3 and 50 then
    resolved_username := requested_username;
  else
    resolved_username := 'learner-' || left(new.id::text, 8);
  end if;

  insert into public.profiles (id, username, role)
  values (new.id, resolved_username, 'learner');

  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
drop trigger if exists set_chapters_updated_at on public.chapters;
create trigger set_chapters_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();
drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();
drop trigger if exists set_exercises_updated_at on public.exercises;
create trigger set_exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
drop trigger if exists set_exercise_solutions_updated_at on public.exercise_solutions;
create trigger set_exercise_solutions_updated_at before update on public.exercise_solutions
  for each row execute function public.set_updated_at();
drop trigger if exists set_user_progress_updated_at on public.user_progress;
create trigger set_user_progress_updated_at before update on public.user_progress
  for each row execute function public.set_updated_at();
