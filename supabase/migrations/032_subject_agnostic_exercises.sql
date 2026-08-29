-- TASK-097: add subject-agnostic Exercise modalities without rewriting existing rows.
-- This migration is authored for review and is not applied by the task workflow.

alter type public.exercise_type add value if not exists 'multiple_choice';
alter type public.exercise_type add value if not exists 'true_false';
alter type public.exercise_type add value if not exists 'short_answer';
alter type public.exercise_type add value if not exists 'ordering';
alter type public.exercise_type add value if not exists 'matching';
alter type public.exercise_type add value if not exists 'scenario';

create or replace function private.generated_exercise_content_is_valid(p_content jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_type text;
  v_item jsonb;
  v_count integer;
  v_distinct_count integer;
begin
  if p_content is null or jsonb_typeof(p_content) <> 'object' then return false; end if;

  -- Legacy coding drafts did not include the discriminator. Keep them reviewable/publishable.
  if not (p_content ? 'type') then
    if not (p_content ?& array['title', 'description', 'codeSnippet', 'options', 'correctAnswer', 'explanation'])
      or p_content - array['title', 'description', 'codeSnippet', 'options', 'correctAnswer', 'explanation'] <> '{}'::jsonb
    then return false; end if;
    v_type := 'legacy_coding';
  else
    v_type := p_content->>'type';
  end if;

  if jsonb_typeof(p_content->'title') <> 'string'
    or char_length(trim(p_content->>'title')) not between 1 and 150
    or jsonb_typeof(p_content->'description') <> 'string'
    or char_length(trim(p_content->>'description')) not between 1 and 2000
    or jsonb_typeof(p_content->'explanation') <> 'string'
    or char_length(trim(p_content->>'explanation')) not between 1 and 5000
  then return false; end if;

  if v_type in ('multiple_choice', 'legacy_coding') then
    if v_type = 'multiple_choice' and p_content - array['type', 'title', 'description', 'explanation', 'options', 'correctAnswer'] <> '{}'::jsonb then return false; end if;
    if v_type = 'legacy_coding' and (
      jsonb_typeof(p_content->'codeSnippet') <> 'string' or char_length(p_content->>'codeSnippet') > 10000
    ) then return false; end if;
    if jsonb_typeof(p_content->'options') <> 'array'
      or jsonb_array_length(p_content->'options') not between 2 and 6
      or jsonb_typeof(p_content->'correctAnswer') <> 'string'
      or char_length(trim(p_content->>'correctAnswer')) not between 1 and 500
    then return false; end if;
  elsif v_type = 'true_false' then
    return p_content - array['type', 'title', 'description', 'explanation', 'correctAnswer'] = '{}'::jsonb
      and jsonb_typeof(p_content->'correctAnswer') = 'boolean';
  elsif v_type = 'short_answer' then
    return p_content - array['type', 'title', 'description', 'explanation', 'expectedAnswer'] = '{}'::jsonb
      and jsonb_typeof(p_content->'expectedAnswer') = 'string'
      and char_length(trim(p_content->>'expectedAnswer')) between 1 and 1000;
  elsif v_type = 'ordering' then
    if p_content - array['type', 'title', 'description', 'explanation', 'items', 'correctOrder'] <> '{}'::jsonb
      or jsonb_typeof(p_content->'items') <> 'array'
      or jsonb_typeof(p_content->'correctOrder') <> 'array'
      or jsonb_array_length(p_content->'items') not between 2 and 8
      or jsonb_array_length(p_content->'items') <> jsonb_array_length(p_content->'correctOrder')
    then return false; end if;
    for v_item in select value from jsonb_array_elements(p_content->'items' || p_content->'correctOrder') loop
      if jsonb_typeof(v_item) <> 'string' or char_length(trim(v_item #>> '{}')) not between 1 and 500 then return false; end if;
    end loop;
    select count(*), count(distinct trim(value)) into v_count, v_distinct_count
    from jsonb_array_elements_text(p_content->'items');
    return v_count = v_distinct_count and not exists (
      select value from jsonb_array_elements_text(p_content->'items')
      except select value from jsonb_array_elements_text(p_content->'correctOrder')
    ) and not exists (
      select value from jsonb_array_elements_text(p_content->'correctOrder')
      except select value from jsonb_array_elements_text(p_content->'items')
    ) and p_content->'items' <> p_content->'correctOrder';
  elsif v_type = 'matching' then
    if p_content - array['type', 'title', 'description', 'explanation', 'pairs'] <> '{}'::jsonb
      or jsonb_typeof(p_content->'pairs') <> 'array'
      or jsonb_array_length(p_content->'pairs') not between 2 and 8
    then return false; end if;
    for v_item in select value from jsonb_array_elements(p_content->'pairs') loop
      if jsonb_typeof(v_item) <> 'object'
        or not (v_item ?& array['prompt', 'answer'])
        or v_item - array['prompt', 'answer'] <> '{}'::jsonb
        or jsonb_typeof(v_item->'prompt') <> 'string'
        or jsonb_typeof(v_item->'answer') <> 'string'
        or char_length(trim(v_item->>'prompt')) not between 1 and 500
        or char_length(trim(v_item->>'answer')) not between 1 and 500
      then return false; end if;
    end loop;
    select count(*), count(distinct trim(value->>'prompt')) into v_count, v_distinct_count from jsonb_array_elements(p_content->'pairs');
    if v_count <> v_distinct_count then return false; end if;
    select count(distinct trim(value->>'answer')) into v_distinct_count from jsonb_array_elements(p_content->'pairs');
    return v_count = v_distinct_count;
  elsif v_type = 'scenario' then
    if p_content - array['type', 'title', 'description', 'explanation', 'scenario', 'options', 'correctAnswer'] <> '{}'::jsonb
      or jsonb_typeof(p_content->'scenario') <> 'string'
      or char_length(trim(p_content->>'scenario')) not between 1 and 4000
      or jsonb_typeof(p_content->'options') <> 'array'
      or jsonb_array_length(p_content->'options') not between 2 and 6
      or jsonb_typeof(p_content->'correctAnswer') <> 'string'
    then return false; end if;
  elsif v_type in ('predict_output', 'fix_the_bug') then
    if p_content - array['type', 'title', 'description', 'explanation', 'codeSnippet', 'options', 'correctAnswer'] <> '{}'::jsonb
      or jsonb_typeof(p_content->'codeSnippet') <> 'string'
      or char_length(trim(p_content->>'codeSnippet')) not between 1 and 10000
      or jsonb_typeof(p_content->'options') <> 'array'
      or jsonb_array_length(p_content->'options') not between 2 and 6
      or jsonb_typeof(p_content->'correctAnswer') <> 'string'
    then return false; end if;
  else
    return false;
  end if;

  for v_item in select value from jsonb_array_elements(p_content->'options') loop
    if jsonb_typeof(v_item) <> 'string' or char_length(trim(v_item #>> '{}')) not between 1 and 500 then return false; end if;
  end loop;
  select count(*), count(distinct trim(value)) into v_count, v_distinct_count from jsonb_array_elements_text(p_content->'options');
  return v_count = v_distinct_count and exists (
    select 1 from jsonb_array_elements_text(p_content->'options') option_text
    where trim(option_text) = trim(p_content->>'correctAnswer')
  );
end;
$$;

revoke all on function private.generated_exercise_content_is_valid(jsonb) from public, anon, authenticated;

create or replace function public.get_lesson_exercise_generation_context(p_lesson_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor_id uuid := auth.uid(); v_context jsonb;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role in ('moderator', 'admin')
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  select jsonb_build_object(
    'lessonId', lesson.id,
    'lessonTitle', lesson.title,
    'lessonSummary', coalesce(outline.summary, ''),
    'lessonContent', coalesce(lesson.content, ''),
    'learningObjectives', coalesce((
      select jsonb_agg(objective.objective order by objective.objective_order)
      from public.course_import_lesson_publications publication
      join public.course_outline_lesson_objectives objective on objective.outline_lesson_id = publication.outline_lesson_id
      where publication.lesson_id = lesson.id
    ), '[]'::jsonb),
    'courseTitle', course.title,
    'courseDescription', course.description
  ) into v_context
  from public.lessons lesson
  join public.chapters chapter on chapter.id = lesson.chapter_id
  join public.courses course on course.id = chapter.course_id
  left join public.course_import_lesson_publications publication on publication.lesson_id = lesson.id
  left join public.course_outline_lessons outline on outline.id = publication.outline_lesson_id
  where lesson.id = p_lesson_id and lesson.is_published and chapter.is_published
    and course.is_published and course.archived_at is null;
  if v_context is null then raise exception 'LESSON_NOT_PUBLISHED' using errcode = 'P0002'; end if;
  return v_context;
end; $$;

create or replace function public.create_generated_exercise_draft(
  p_lesson_id bigint, p_exercise_type public.exercise_type, p_difficulty public.difficulty_level,
  p_content jsonb, p_provider text, p_model text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor_id uuid := auth.uid(); v_id bigint; v_created_at timestamptz;
begin
  if v_actor_id is null or not exists (select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role in ('moderator', 'admin'))
  then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  if not exists (
    select 1 from public.lessons lesson join public.chapters chapter on chapter.id = lesson.chapter_id
    join public.courses course on course.id = chapter.course_id
    where lesson.id = p_lesson_id and lesson.is_published and chapter.is_published and course.is_published and course.archived_at is null
  ) then raise exception 'LESSON_NOT_PUBLISHED' using errcode = 'P0002'; end if;
  if not private.generated_exercise_content_is_valid(p_content)
    or p_content->>'type' is distinct from p_exercise_type::text
    or char_length(trim(p_provider)) not between 1 and 50
    or (p_model is not null and char_length(trim(p_model)) not between 1 and 100)
  then raise exception 'EXERCISE_DRAFT_INVALID' using errcode = 'P0001'; end if;
  insert into public.generated_exercises (lesson_id, requested_by, title, description, exercise_type, difficulty, content, status, provider, model)
  values (p_lesson_id, v_actor_id, trim(p_content->>'title'), trim(p_content->>'description'), p_exercise_type, p_difficulty,
    p_content, 'pending', trim(p_provider), nullif(trim(p_model), ''))
  returning id, created_at into v_id, v_created_at;
  return jsonb_build_object('id', v_id, 'lessonId', p_lesson_id, 'exerciseType', p_exercise_type, 'difficulty', p_difficulty,
    'title', trim(p_content->>'title'), 'description', trim(p_content->>'description'), 'content', p_content,
    'status', 'pending', 'provider', trim(p_provider), 'model', nullif(trim(p_model), ''), 'requestedBy', v_actor_id,
    'publishedExerciseId', null, 'publishedAt', null, 'createdAt', v_created_at, 'updatedAt', v_created_at);
end; $$;

create or replace function public.review_generated_exercise_draft(
  p_generated_exercise_id bigint, p_decision public.review_status, p_comment text default null, p_edited_draft jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid(); v_draft public.generated_exercises%rowtype; v_review_id bigint; v_reviewed_at timestamptz;
  v_title text; v_description text; v_content jsonb; v_type public.exercise_type; v_difficulty public.difficulty_level;
begin
  if v_actor_id is null or not exists (select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role in ('moderator', 'admin'))
  then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  if p_comment is not null and char_length(p_comment) > 2000 then raise exception 'COMMENT_INVALID' using errcode = 'P0001'; end if;
  if p_decision is null then raise exception 'DECISION_INVALID' using errcode = 'P0001'; end if;
  select * into v_draft from public.generated_exercises where id = p_generated_exercise_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_draft.status = 'published' or v_draft.published_exercise_id is not null then raise exception 'ALREADY_PUBLISHED' using errcode = 'P0004'; end if;
  v_title := v_draft.title; v_description := coalesce(v_draft.description, ''); v_content := v_draft.content;
  v_type := v_draft.exercise_type; v_difficulty := v_draft.difficulty;
  if p_edited_draft is not null then
    if jsonb_typeof(p_edited_draft) <> 'object'
      or not (p_edited_draft ?& array['title', 'description', 'exerciseType', 'difficulty', 'content'])
      or p_edited_draft - array['title', 'description', 'exerciseType', 'difficulty', 'content'] <> '{}'::jsonb
      or (p_edited_draft->>'exerciseType') not in ('multiple_choice', 'true_false', 'short_answer', 'ordering', 'matching', 'scenario', 'predict_output', 'fix_the_bug')
      or (p_edited_draft->>'difficulty') not in ('easy', 'medium', 'hard')
      or not private.generated_exercise_content_is_valid(p_edited_draft->'content')
      or p_edited_draft->'content'->>'type' is distinct from p_edited_draft->>'exerciseType'
      or trim(p_edited_draft->>'title') is distinct from trim(p_edited_draft->'content'->>'title')
      or trim(p_edited_draft->>'description') is distinct from trim(p_edited_draft->'content'->>'description')
    then raise exception 'EXERCISE_DRAFT_INVALID' using errcode = 'P0001'; end if;
    v_title := trim(p_edited_draft->>'title'); v_description := trim(p_edited_draft->>'description');
    v_content := p_edited_draft->'content'; v_type := (p_edited_draft->>'exerciseType')::public.exercise_type;
    v_difficulty := (p_edited_draft->>'difficulty')::public.difficulty_level;
  end if;
  if p_decision = 'approved' and not private.generated_exercise_content_is_valid(v_content)
  then raise exception 'EXERCISE_DRAFT_INVALID' using errcode = 'P0001'; end if;
  insert into public.exercise_reviews (generated_exercise_id, reviewer_id, status, comment, edited_snapshot)
  values (p_generated_exercise_id, v_actor_id, p_decision, nullif(trim(p_comment), ''), p_edited_draft)
  returning id, reviewed_at into v_review_id, v_reviewed_at;
  update public.generated_exercises set title = v_title, description = v_description, content = v_content,
    exercise_type = v_type, difficulty = v_difficulty, status = p_decision::text::public.generated_exercise_status, updated_at = now()
  where id = p_generated_exercise_id;
  return jsonb_build_object('id', v_review_id, 'generatedExerciseId', p_generated_exercise_id, 'reviewerId', v_actor_id,
    'status', p_decision, 'feedback', nullif(trim(p_comment), ''), 'createdAt', v_reviewed_at);
end; $$;

create or replace function public.publish_generated_exercise(p_generated_exercise_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid(); v_draft public.generated_exercises%rowtype; v_exercise_id bigint; v_next_order integer;
  v_option record; v_option_id bigint; v_correct_option_id bigint; v_solution jsonb := '{}'::jsonb;
  v_answer_options jsonb; v_correct_order_ids jsonb; v_matches jsonb := '{}'::jsonb; v_published_at timestamptz := now();
begin
  if v_actor_id is null or not exists (select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role in ('moderator', 'admin'))
  then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  select * into v_draft from public.generated_exercises where id = p_generated_exercise_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_draft.status = 'published' and v_draft.published_exercise_id is not null then
    return jsonb_build_object('generatedExerciseId', v_draft.id, 'publishedExerciseId', v_draft.published_exercise_id,
      'status', 'published', 'publishedAt', v_draft.published_at);
  end if;
  if v_draft.status <> 'approved' then raise exception 'NOT_APPROVED' using errcode = 'P0004'; end if;
  if not private.generated_exercise_content_is_valid(v_draft.content) then raise exception 'EXERCISE_DRAFT_INVALID' using errcode = 'P0001'; end if;
  perform 1 from public.lessons lesson join public.chapters chapter on chapter.id = lesson.chapter_id
  join public.courses course on course.id = chapter.course_id where lesson.id = v_draft.lesson_id and lesson.is_published
    and chapter.is_published and course.is_published and course.archived_at is null for update of lesson;
  if not found then raise exception 'LESSON_NOT_PUBLISHED' using errcode = 'P0005'; end if;
  perform pg_advisory_xact_lock(v_draft.lesson_id);
  select coalesce(max(exercise_order), 0) + 1 into v_next_order from public.exercises where lesson_id = v_draft.lesson_id;
  insert into public.exercises (lesson_id, title, description, exercise_type, difficulty, code_snippet, exercise_order, is_required, is_published, source)
  values (v_draft.lesson_id, v_draft.title,
    case when v_draft.exercise_type = 'scenario' then v_draft.description || E'\n\n' || trim(v_draft.content->>'scenario') else v_draft.description end,
    v_draft.exercise_type, v_draft.difficulty,
    case when v_draft.exercise_type in ('predict_output', 'fix_the_bug') then v_draft.content->>'codeSnippet' else null end,
    v_next_order, true, true, 'ai_generated') returning id into v_exercise_id;

  if v_draft.exercise_type in ('multiple_choice', 'scenario', 'predict_output', 'fix_the_bug')
    or (v_draft.exercise_type in ('predict_output', 'fix_the_bug') and not (v_draft.content ? 'type'))
  then
    for v_option in select trim(value) content, ordinality::integer option_order
      from jsonb_array_elements_text(v_draft.content->'options') with ordinality loop
      insert into public.exercise_options (exercise_id, content, option_order, metadata)
      values (v_exercise_id, v_option.content, v_option.option_order, '{}'::jsonb) returning id into v_option_id;
      if v_option.content = trim(v_draft.content->>'correctAnswer') then v_correct_option_id := v_option_id; end if;
    end loop;
    if v_correct_option_id is null then raise exception 'CORRECT_OPTION_MISSING' using errcode = 'P0001'; end if;
    v_solution := jsonb_build_object('correctOptionId', v_correct_option_id);
  elsif v_draft.exercise_type = 'true_false' then
    insert into public.exercise_options (exercise_id, content, option_order, metadata) values (v_exercise_id, 'Đúng', 1, '{}'::jsonb)
    returning id into v_option_id; if (v_draft.content->>'correctAnswer')::boolean then v_correct_option_id := v_option_id; end if;
    insert into public.exercise_options (exercise_id, content, option_order, metadata) values (v_exercise_id, 'Sai', 2, '{}'::jsonb)
    returning id into v_option_id; if not (v_draft.content->>'correctAnswer')::boolean then v_correct_option_id := v_option_id; end if;
    v_solution := jsonb_build_object('correctOptionId', v_correct_option_id);
  elsif v_draft.exercise_type = 'short_answer' then
    v_solution := jsonb_build_object('expectedAnswer', trim(v_draft.content->>'expectedAnswer'));
  elsif v_draft.exercise_type = 'ordering' then
    for v_option in select trim(value) content, ordinality::integer option_order
      from jsonb_array_elements_text(v_draft.content->'items') with ordinality loop
      insert into public.exercise_options (exercise_id, content, option_order, metadata)
      values (v_exercise_id, v_option.content, v_option.option_order, '{}'::jsonb);
    end loop;
    select jsonb_agg(option_row.id order by correct_item.ordinality) into v_correct_order_ids
    from jsonb_array_elements_text(v_draft.content->'correctOrder') with ordinality correct_item(value, ordinality)
    join public.exercise_options option_row on option_row.exercise_id = v_exercise_id and option_row.content = trim(correct_item.value);
    v_solution := jsonb_build_object('correctOrderOptionIds', v_correct_order_ids);
  elsif v_draft.exercise_type = 'matching' then
    select jsonb_agg(trim(value->>'answer') order by md5(trim(value->>'answer') || v_exercise_id::text)) into v_answer_options
    from jsonb_array_elements(v_draft.content->'pairs') with ordinality pair(value, ordinality);
    for v_option in select value, ordinality::integer option_order
      from jsonb_array_elements(v_draft.content->'pairs') with ordinality loop
      insert into public.exercise_options (exercise_id, content, option_order, metadata)
      values (v_exercise_id, trim(v_option.value->>'prompt'), v_option.option_order, jsonb_build_object('answerOptions', v_answer_options))
      returning id into v_option_id;
      v_matches := v_matches || jsonb_build_object(v_option_id::text, trim(v_option.value->>'answer'));
    end loop;
    v_solution := jsonb_build_object('matches', v_matches);
  end if;
  insert into public.exercise_solutions (exercise_id, solution, static_explanation)
  values (v_exercise_id, v_solution, trim(v_draft.content->>'explanation'));
  update public.generated_exercises set status = 'published', published_exercise_id = v_exercise_id,
    published_at = v_published_at, updated_at = v_published_at where id = v_draft.id;
  insert into public.admin_logs (actor_id, action, target_type, target_id, metadata)
  values (v_actor_id, 'generated_exercise.published', 'generated_exercise', v_draft.id::text,
    jsonb_build_object('published_exercise_id', v_exercise_id, 'lesson_id', v_draft.lesson_id));
  return jsonb_build_object('generatedExerciseId', v_draft.id, 'publishedExerciseId', v_exercise_id,
    'status', 'published', 'publishedAt', v_published_at);
end; $$;

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
      or jsonb_array_length(p_answer->'matches') <> jsonb_object_length(stored_solution->'matches')
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

revoke all on function public.get_lesson_exercise_generation_context(bigint) from public, anon;
revoke all on function public.create_generated_exercise_draft(bigint, public.exercise_type, public.difficulty_level, jsonb, text, text) from public, anon;
revoke all on function public.review_generated_exercise_draft(bigint, public.review_status, text, jsonb) from public, anon;
revoke all on function public.publish_generated_exercise(bigint) from public, anon;
revoke all on function public.submit_exercise(bigint, jsonb) from public;
grant execute on function public.get_lesson_exercise_generation_context(bigint) to authenticated;
grant execute on function public.create_generated_exercise_draft(bigint, public.exercise_type, public.difficulty_level, jsonb, text, text) to authenticated;
grant execute on function public.review_generated_exercise_draft(bigint, public.review_status, text, jsonb) to authenticated;
grant execute on function public.publish_generated_exercise(bigint) to authenticated;
grant execute on function public.submit_exercise(bigint, jsonb) to authenticated;
