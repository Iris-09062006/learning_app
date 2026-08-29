-- TASK-107: Correct PostgreSQL-compatible matching-pair count in submit_exercise.
-- Migration 032 is already deployed; preserve this RPC's signature and behavior.
create or replace function public.submit_exercise(p_exercise_id bigint, p_answer jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid(); current_lesson_id bigint; current_course_id bigint;
  current_chapter_order integer; current_lesson_order integer; current_progress_status public.progress_status;
  current_exercise_type public.exercise_type; stored_solution jsonb; selected_option_id bigint;
  answer_is_correct boolean := false; answer_score numeric(5,2); next_attempt_number integer;
  new_submission_id bigint; lesson_is_completed boolean := false; unlocked_lesson_id bigint; v_entry jsonb; v_valid boolean;
begin
  if current_user_id is null then raise exception using errcode = '28000', message = 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = current_user_id and role = 'learner' and is_active)
  then raise exception using errcode = '42501', message = 'Active learner profile required'; end if;
  select exercises.lesson_id, chapters.course_id, chapters.chapter_order, lessons.lesson_order,
    exercises.exercise_type, exercise_solutions.solution
  into current_lesson_id, current_course_id, current_chapter_order, current_lesson_order, current_exercise_type, stored_solution
  from public.exercises join public.exercise_solutions on exercise_solutions.exercise_id = exercises.id
  join public.lessons on lessons.id = exercises.lesson_id join public.chapters on chapters.id = lessons.chapter_id
  join public.courses on courses.id = chapters.course_id
  where exercises.id = p_exercise_id and exercises.is_published and lessons.is_published and chapters.is_published and courses.is_published;
  if not found then raise exception using errcode = 'P0002', message = 'Published exercise not found'; end if;
  select status into current_progress_status from public.user_progress
  where user_id = current_user_id and lesson_id = current_lesson_id for update;
  if not found then raise exception using errcode = '42501', message = 'Lesson access required'; end if;
  if current_progress_status = 'locked' then raise exception using errcode = '42501', message = 'Lesson is locked'; end if;

  if current_exercise_type in ('multiple_choice', 'true_false', 'scenario', 'predict_output', 'fix_the_bug') then
    if jsonb_typeof(p_answer) <> 'object' or p_answer - 'selectedOptionId' <> '{}'::jsonb
      or jsonb_typeof(p_answer->'selectedOptionId') <> 'number' or (p_answer->>'selectedOptionId') !~ '^[1-9][0-9]*$'
    then raise exception using errcode = '22023', message = 'Invalid exercise answer'; end if;
    selected_option_id := (p_answer->>'selectedOptionId')::bigint;
    if not exists (select 1 from public.exercise_options where id = selected_option_id and exercise_id = p_exercise_id)
    then raise exception using errcode = '22023', message = 'Invalid exercise option'; end if;
    if jsonb_typeof(stored_solution->'correctOptionId') <> 'number' then raise exception using errcode = '22000', message = 'Exercise solution is invalid'; end if;
    answer_is_correct := selected_option_id = (stored_solution->>'correctOptionId')::bigint;
  elsif current_exercise_type = 'short_answer' then
    if jsonb_typeof(p_answer) <> 'object' or p_answer - 'answerText' <> '{}'::jsonb
      or jsonb_typeof(p_answer->'answerText') <> 'string' or char_length(trim(p_answer->>'answerText')) not between 1 and 1000
      or jsonb_typeof(stored_solution->'expectedAnswer') <> 'string'
    then raise exception using errcode = '22023', message = 'Invalid exercise answer'; end if;
    answer_is_correct := lower(trim(p_answer->>'answerText')) = lower(trim(stored_solution->>'expectedAnswer'));
  elsif current_exercise_type = 'ordering' then
    if jsonb_typeof(p_answer) <> 'object' or p_answer - 'orderedOptionIds' <> '{}'::jsonb
      or jsonb_typeof(p_answer->'orderedOptionIds') <> 'array'
      or jsonb_typeof(stored_solution->'correctOrderOptionIds') <> 'array'
    then raise exception using errcode = '22023', message = 'Invalid exercise answer'; end if;
    for v_entry in select value from jsonb_array_elements(p_answer->'orderedOptionIds') loop
      if jsonb_typeof(v_entry) <> 'number' or (v_entry #>> '{}') !~ '^[1-9][0-9]*$' or not exists (
        select 1 from public.exercise_options where id = (v_entry #>> '{}')::bigint and exercise_id = p_exercise_id
      ) then raise exception using errcode = '22023', message = 'Invalid exercise option'; end if;
    end loop;
    answer_is_correct := p_answer->'orderedOptionIds' = stored_solution->'correctOrderOptionIds';
  elsif current_exercise_type = 'matching' then
    if jsonb_typeof(p_answer) <> 'object' or p_answer - 'matches' <> '{}'::jsonb
      or jsonb_typeof(p_answer->'matches') <> 'array' or jsonb_typeof(stored_solution->'matches') <> 'object'
      or jsonb_array_length(p_answer->'matches') <> (
        select count(*) from jsonb_object_keys(stored_solution->'matches')
      )
    then raise exception using errcode = '22023', message = 'Invalid exercise answer'; end if;
    select count(*) = count(distinct value->>'optionId') into v_valid
    from jsonb_array_elements(p_answer->'matches');
    if not v_valid then raise exception using errcode = '22023', message = 'Invalid exercise answer'; end if;
    for v_entry in select value from jsonb_array_elements(p_answer->'matches') loop
      if jsonb_typeof(v_entry) <> 'object' or v_entry - array['optionId', 'answer'] <> '{}'::jsonb
        or jsonb_typeof(v_entry->'optionId') <> 'number' or (v_entry->>'optionId') !~ '^[1-9][0-9]*$'
        or jsonb_typeof(v_entry->'answer') <> 'string'
        or not exists (select 1 from public.exercise_options where id = (v_entry->>'optionId')::bigint and exercise_id = p_exercise_id)
        or stored_solution->'matches'->>(v_entry->>'optionId') is distinct from trim(v_entry->>'answer')
      then v_valid := false; end if;
    end loop;
    answer_is_correct := v_valid;
  else
    raise exception using errcode = '22023', message = 'Unsupported exercise type';
  end if;

  answer_score := case when answer_is_correct then 100.00 else 0.00 end;
  select coalesce(max(attempt_number), 0) + 1 into next_attempt_number from public.submissions
  where user_id = current_user_id and exercise_id = p_exercise_id;
  insert into public.submissions (user_id, exercise_id, answer, is_correct, score, attempt_number)
  values (current_user_id, p_exercise_id, p_answer, answer_is_correct, answer_score, next_attempt_number)
  returning id into new_submission_id;
  lesson_is_completed := current_progress_status = 'completed';
  if answer_is_correct and not lesson_is_completed then
    select not exists (
      select 1 from public.exercises required_exercise where required_exercise.lesson_id = current_lesson_id
        and required_exercise.is_published and required_exercise.is_required and not exists (
          select 1 from public.submissions correct_submission where correct_submission.user_id = current_user_id
            and correct_submission.exercise_id = required_exercise.id and correct_submission.is_correct
        )
    ) into lesson_is_completed;
    if lesson_is_completed then
      update public.user_progress set status = 'completed', completed_at = coalesce(completed_at, now()), last_accessed_at = now()
      where user_id = current_user_id and lesson_id = current_lesson_id;
      with next_lesson as (
        select lessons.id from public.lessons join public.chapters on chapters.id = lessons.chapter_id
        where chapters.course_id = current_course_id and chapters.is_published and lessons.is_published
          and (chapters.chapter_order, lessons.lesson_order) > (current_chapter_order, current_lesson_order)
        order by chapters.chapter_order, lessons.lesson_order limit 1
      ) update public.user_progress set status = 'unlocked' from next_lesson
      where user_progress.user_id = current_user_id and user_progress.lesson_id = next_lesson.id and user_progress.status = 'locked'
      returning user_progress.lesson_id into unlocked_lesson_id;
      if not exists (
        select 1 from public.lessons join public.chapters on chapters.id = lessons.chapter_id
        where chapters.course_id = current_course_id and chapters.is_published and lessons.is_published and not exists (
          select 1 from public.user_progress where user_progress.user_id = current_user_id
            and user_progress.lesson_id = lessons.id and user_progress.status = 'completed'
        )
      ) then update public.course_enrollments set status = 'completed', completed_at = coalesce(completed_at, now())
        where user_id = current_user_id and course_id = current_course_id;
      end if;
    end if;
  end if;
  return jsonb_build_object('submission_id', new_submission_id, 'is_correct', answer_is_correct, 'score', answer_score,
    'lesson_completed', lesson_is_completed, 'next_lesson_unlocked_id', unlocked_lesson_id);
end; $$;

