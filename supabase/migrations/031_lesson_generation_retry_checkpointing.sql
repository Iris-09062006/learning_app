-- Preserve per-Lesson ready drafts as durable checkpoints and reuse the approved outline on retry.
create or replace function public.prepare_course_lesson_generation(p_job_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_job public.course_import_jobs%rowtype;
  v_outline_revision integer;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;

  select * into v_job from public.course_import_jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;

  v_outline_revision := coalesce(v_job.approved_outline_revision, v_job.current_outline_revision);
  if v_job.status not in ('outline_review', 'content_review', 'ready_to_publish', 'failed')
    or v_outline_revision < 1
    or not exists (
      select 1 from public.course_drafts d
      where d.job_id = v_job.id and d.revision = v_outline_revision
    )
  then raise exception 'JOB_STATE_INVALID' using errcode = 'P0004'; end if;

  update public.course_import_jobs
  set status = 'generating_content',
      approved_outline_revision = v_outline_revision,
      error_code = null
  where id = p_job_id;

  return jsonb_build_object(
    'jobId', p_job_id,
    'status', 'generating_content',
    'outlineRevision', v_outline_revision
  );
end;
$$;

revoke all on function public.prepare_course_lesson_generation(bigint) from public, anon;
grant execute on function public.prepare_course_lesson_generation(bigint) to authenticated;

-- Bulk retry uses this only after reloading the approved outline and finding no missing ready draft.
create or replace function public.reconcile_course_lesson_generation(p_job_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_job public.course_import_jobs%rowtype;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;

  select * into v_job from public.course_import_jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_job.status <> 'generating_content' or v_job.approved_outline_revision is null
    or not exists (
      select 1 from public.course_outline_lessons lesson
      join public.course_drafts draft on draft.id = lesson.course_draft_id
      where draft.job_id = v_job.id and draft.revision = v_job.approved_outline_revision
    )
    or exists (
      select 1 from public.course_outline_lessons lesson
      join public.course_drafts draft on draft.id = lesson.course_draft_id
      where draft.job_id = v_job.id
        and draft.revision = v_job.approved_outline_revision
        and not exists (
          select 1 from public.lesson_content_drafts content
          where content.outline_lesson_id = lesson.id and content.status = 'ready'
        )
    )
  then raise exception 'LESSON_CONTENT_MISSING' using errcode = 'P0006'; end if;

  update public.course_import_jobs
  set status = 'content_review', error_code = null
  where id = p_job_id;

  return jsonb_build_object(
    'jobId', p_job_id,
    'status', 'content_review',
    'outlineRevision', v_job.approved_outline_revision
  );
end;
$$;

revoke all on function public.reconcile_course_lesson_generation(bigint) from public, anon;
grant execute on function public.reconcile_course_lesson_generation(bigint) to authenticated;
