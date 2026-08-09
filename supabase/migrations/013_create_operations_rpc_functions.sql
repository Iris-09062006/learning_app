create or replace function public.publish_generated_exercise(
  p_generated_exercise_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_role public.user_role;
  v_gen_ex record;
  v_lesson record;
  v_next_order integer;
  v_exercise_id bigint;
  v_option jsonb;
begin
  -- 1. Authentication and Authorization check
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  select role into v_actor_role
  from public.profiles
  where id = v_actor_id and is_active = true;

  if v_actor_role is null or v_actor_role not in ('moderator', 'admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0003';
  end if;

  -- 2. Fetch generated exercise
  select * into v_gen_ex
  from public.generated_exercises
  where id = p_generated_exercise_id;

  if v_gen_ex.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_gen_ex.published_exercise_id is not null or v_gen_ex.status = 'published' then
    raise exception 'ALREADY_PUBLISHED' using errcode = '23505'; -- Conflict
  end if;

  if v_gen_ex.status != 'approved' then
    raise exception 'NOT_APPROVED' using errcode = 'P0004';
  end if;

  -- 3. Check parent lesson published status
  select * into v_lesson
  from public.lessons
  where id = v_gen_ex.lesson_id;

  if v_lesson.id is null or not v_lesson.is_published then
    raise exception 'LESSON_NOT_PUBLISHED' using errcode = 'P0005';
  end if;

  -- 4. Calculate next exercise_order for lesson
  select coalesce(max(exercise_order), 0) + 1 into v_next_order
  from public.exercises
  where lesson_id = v_gen_ex.lesson_id;

  -- 5. Insert exercise
  insert into public.exercises (
    lesson_id,
    title,
    description,
    exercise_type,
    difficulty,
    code_snippet,
    exercise_order,
    is_required,
    is_published,
    source
  ) values (
    v_gen_ex.lesson_id,
    v_gen_ex.title,
    v_gen_ex.description,
    v_gen_ex.exercise_type,
    v_gen_ex.difficulty,
    v_gen_ex.content->>'codeSnippet',
    v_next_order,
    true,
    true,
    'ai_generated'
  )
  returning id into v_exercise_id;

  -- 6. Insert exercise options
  if v_gen_ex.content->'options' is not null and jsonb_array_length(v_gen_ex.content->'options') > 0 then
    for v_option in select * from jsonb_array_elements(v_gen_ex.content->'options')
    loop
      insert into public.exercise_options (
        exercise_id,
        content,
        option_order,
        metadata
      ) values (
        v_exercise_id,
        v_option->>'content',
        (v_option->>'order')::integer,
        coalesce(v_option->'metadata', '{}'::jsonb)
      );
    end loop;
  end if;

  -- 7. Insert exercise solution
  insert into public.exercise_solutions (
    exercise_id,
    solution,
    static_explanation
  ) values (
    v_exercise_id,
    v_gen_ex.content->'solution',
    v_gen_ex.content->>'explanation'
  );

  -- 8. Update generated_exercises status
  update public.generated_exercises
  set
    status = 'published',
    published_exercise_id = v_exercise_id,
    published_at = now(),
    updated_at = now()
  where id = p_generated_exercise_id;

  -- 9. Record admin log
  insert into public.admin_logs (
    actor_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    v_actor_id,
    'generated_exercise.published',
    'generated_exercise',
    p_generated_exercise_id::text,
    jsonb_build_object('published_exercise_id', v_exercise_id)
  );

  -- 10. Return result
  return jsonb_build_object(
    'generatedExerciseId', p_generated_exercise_id,
    'publishedExerciseId', v_exercise_id,
    'status', 'published',
    'publishedAt', now()
  );
end;
$$;