create or replace function public.enroll_course(p_course_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_enrollment public.course_enrollments%rowtype;
  first_lesson_id bigint;
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role = 'learner'
      and is_active = true
  ) then
    raise exception using errcode = '42501', message = 'Active learner profile required';
  end if;

  if not exists (
    select 1
    from public.courses
    where id = p_course_id
      and is_published = true
  ) then
    raise exception using errcode = 'P0002', message = 'Published course not found';
  end if;

  if exists (
    select 1
    from public.course_enrollments
    where user_id = current_user_id
      and course_id = p_course_id
  ) then
    raise exception using errcode = '23505', message = 'Course enrollment already exists';
  end if;

  insert into public.course_enrollments (user_id, course_id, status)
  values (current_user_id, p_course_id, 'active')
  returning * into new_enrollment;

  select lessons.id
  into first_lesson_id
  from public.lessons
  join public.chapters on chapters.id = lessons.chapter_id
  where chapters.course_id = p_course_id
    and chapters.is_published = true
    and lessons.is_published = true
  order by chapters.chapter_order, lessons.lesson_order
  limit 1;

  insert into public.user_progress (user_id, lesson_id, status)
  select
    current_user_id,
    lessons.id,
    case
      when lessons.id = first_lesson_id then 'unlocked'::public.progress_status
      else 'locked'::public.progress_status
    end
  from public.lessons
  join public.chapters on chapters.id = lessons.chapter_id
  where chapters.course_id = p_course_id
    and chapters.is_published = true
    and lessons.is_published = true;

  return jsonb_build_object(
    'enrollment_id', new_enrollment.id,
    'course_id', new_enrollment.course_id,
    'enrolled_at', new_enrollment.enrolled_at,
    'first_lesson_id', first_lesson_id
  );
end;
$$;

create or replace function public.submit_exercise(
  p_exercise_id bigint,
  p_answer jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_lesson_id bigint;
  current_course_id bigint;
  current_chapter_order integer;
  current_lesson_order integer;
  current_progress_status public.progress_status;
  stored_solution jsonb;
  selected_option_id bigint;
  correct_option_id bigint;
  answer_is_correct boolean;
  answer_score numeric(5, 2);
  next_attempt_number integer;
  new_submission_id bigint;
  lesson_is_completed boolean := false;
  unlocked_lesson_id bigint;
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role = 'learner'
      and is_active = true
  ) then
    raise exception using errcode = '42501', message = 'Active learner profile required';
  end if;

  select
    exercises.lesson_id,
    chapters.course_id,
    chapters.chapter_order,
    lessons.lesson_order,
    exercise_solutions.solution
  into
    current_lesson_id,
    current_course_id,
    current_chapter_order,
    current_lesson_order,
    stored_solution
  from public.exercises
  join public.exercise_solutions
    on exercise_solutions.exercise_id = exercises.id
  join public.lessons on lessons.id = exercises.lesson_id
  join public.chapters on chapters.id = lessons.chapter_id
  join public.courses on courses.id = chapters.course_id
  where exercises.id = p_exercise_id
    and exercises.is_published = true
    and lessons.is_published = true
    and chapters.is_published = true
    and courses.is_published = true;

  if not found then
    raise exception using errcode = 'P0002', message = 'Published exercise not found';
  end if;

  select status
  into current_progress_status
  from public.user_progress
  where user_id = current_user_id
    and lesson_id = current_lesson_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Lesson access required';
  end if;

  if current_progress_status = 'locked' then
    raise exception using errcode = '42501', message = 'Lesson is locked';
  end if;

  if jsonb_typeof(p_answer) <> 'object'
    or not (p_answer ? 'selectedOptionId')
    or jsonb_typeof(p_answer -> 'selectedOptionId') <> 'number'
    or (p_answer ->> 'selectedOptionId') !~ '^[1-9][0-9]*$'
  then
    raise exception using errcode = '22023', message = 'Invalid exercise answer';
  end if;

  selected_option_id := (p_answer ->> 'selectedOptionId')::bigint;

  if not exists (
    select 1
    from public.exercise_options
    where id = selected_option_id
      and exercise_id = p_exercise_id
  ) then
    raise exception using errcode = '22023', message = 'Invalid exercise option';
  end if;

  if jsonb_typeof(stored_solution -> 'correctOptionId') <> 'number'
    or (stored_solution ->> 'correctOptionId') !~ '^[1-9][0-9]*$'
  then
    raise exception using errcode = '22000', message = 'Exercise solution is invalid';
  end if;

  correct_option_id := (stored_solution ->> 'correctOptionId')::bigint;
  answer_is_correct := selected_option_id = correct_option_id;
  answer_score := case when answer_is_correct then 100.00 else 0.00 end;

  select coalesce(max(attempt_number), 0) + 1
  into next_attempt_number
  from public.submissions
  where user_id = current_user_id
    and exercise_id = p_exercise_id;

  insert into public.submissions (
    user_id,
    exercise_id,
    answer,
    is_correct,
    score,
    attempt_number
  )
  values (
    current_user_id,
    p_exercise_id,
    p_answer,
    answer_is_correct,
    answer_score,
    next_attempt_number
  )
  returning id into new_submission_id;

  lesson_is_completed := current_progress_status = 'completed';

  if answer_is_correct and not lesson_is_completed then
    select not exists (
      select 1
      from public.exercises required_exercise
      where required_exercise.lesson_id = current_lesson_id
        and required_exercise.is_published = true
        and required_exercise.is_required = true
        and not exists (
          select 1
          from public.submissions correct_submission
          where correct_submission.user_id = current_user_id
            and correct_submission.exercise_id = required_exercise.id
            and correct_submission.is_correct = true
        )
    )
    into lesson_is_completed;

    if lesson_is_completed then
      update public.user_progress
      set
        status = 'completed',
        completed_at = coalesce(completed_at, now()),
        last_accessed_at = now()
      where user_id = current_user_id
        and lesson_id = current_lesson_id;

      with next_lesson as (
        select lessons.id
        from public.lessons
        join public.chapters on chapters.id = lessons.chapter_id
        where chapters.course_id = current_course_id
          and chapters.is_published = true
          and lessons.is_published = true
          and (chapters.chapter_order, lessons.lesson_order)
            > (current_chapter_order, current_lesson_order)
        order by chapters.chapter_order, lessons.lesson_order
        limit 1
      )
      update public.user_progress
      set status = 'unlocked'
      from next_lesson
      where user_progress.user_id = current_user_id
        and user_progress.lesson_id = next_lesson.id
        and user_progress.status = 'locked'
      returning user_progress.lesson_id into unlocked_lesson_id;

      if not exists (
        select 1
        from public.lessons
        join public.chapters on chapters.id = lessons.chapter_id
        where chapters.course_id = current_course_id
          and chapters.is_published = true
          and lessons.is_published = true
          and not exists (
            select 1
            from public.user_progress
            where user_progress.user_id = current_user_id
              and user_progress.lesson_id = lessons.id
              and user_progress.status = 'completed'
          )
      ) then
        update public.course_enrollments
        set status = 'completed', completed_at = coalesce(completed_at, now())
        where user_id = current_user_id
          and course_id = current_course_id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'submission_id', new_submission_id,
    'is_correct', answer_is_correct,
    'score', answer_score,
    'lesson_completed', lesson_is_completed,
    'next_lesson_unlocked_id', unlocked_lesson_id
  );
end;
$$;

revoke all on function public.enroll_course(bigint) from public;
revoke all on function public.submit_exercise(bigint, jsonb) from public;
grant execute on function public.enroll_course(bigint) to authenticated;
grant execute on function public.submit_exercise(bigint, jsonb) to authenticated;
