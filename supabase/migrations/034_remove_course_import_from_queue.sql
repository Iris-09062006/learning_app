create or replace function public.remove_course_import_from_queue(p_job_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_job public.course_import_jobs%rowtype;
  v_source_ids bigint[];
  v_storage_objects jsonb;
begin
  if v_actor_id is null or not exists (
    select 1
    from public.profiles profile
    where profile.id = v_actor_id
      and profile.is_active
      and profile.role = 'admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0003';
  end if;

  select * into v_job
  from public.course_import_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_job.status in ('published', 'rejected')
    or v_job.published_course_id is not null
    or exists (
      select 1 from public.course_import_publications publication
      where publication.job_id = v_job.id
    )
  then
    raise exception 'JOB_STATE_INVALID' using errcode = 'P0004';
  end if;

  select
    coalesce(array_agg(source.id order by bridge.source_order), '{}'::bigint[]),
    coalesce(jsonb_agg(jsonb_build_object(
      'bucket', source.storage_bucket,
      'path', source.storage_path
    ) order by bridge.source_order), '[]'::jsonb)
  into v_source_ids, v_storage_objects
  from public.course_import_job_sources bridge
  join public.source_documents source on source.id = bridge.source_document_id
  where bridge.job_id = v_job.id;

  delete from public.course_import_jobs where id = v_job.id;
  delete from public.source_documents where id = any(v_source_ids);

  insert into public.admin_logs (actor_id, action, target_type, target_id, metadata)
  values (
    v_actor_id,
    'course_import.removed_from_queue',
    'course_import_job',
    v_job.id::text,
    jsonb_build_object(
      'previous_status', v_job.status,
      'source_document_ids', to_jsonb(v_source_ids)
    )
  );

  return jsonb_build_object(
    'jobId', v_job.id,
    'deleted', true,
    'sourceCount', cardinality(v_source_ids),
    'storageObjects', v_storage_objects
  );
end;
$$;

revoke all on function public.remove_course_import_from_queue(bigint) from public, anon;
grant execute on function public.remove_course_import_from_queue(bigint) to authenticated;
