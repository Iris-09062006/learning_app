create or replace function public.admin_change_user_role(
  p_user_id uuid,
  p_role public.user_role
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target public.profiles%rowtype;
  v_active_admin_count integer;
  v_audit_log_id bigint;
  v_updated_at timestamptz;
begin
  if v_actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and role = 'admin' and is_active = true
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0003';
  end if;

  perform id
  from public.profiles
  where role = 'admin' and is_active = true
  order by id
  for update;

  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and role = 'admin' and is_active = true
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0003';
  end if;

  select * into v_target
  from public.profiles
  where id = p_user_id
  for update;

  if v_target.id is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_target.role = 'admin' and v_target.is_active and p_role <> 'admin' then
    select count(*) into v_active_admin_count
    from public.profiles
    where role = 'admin' and is_active = true;

    if v_active_admin_count <= 1 then
      raise exception 'LAST_ACTIVE_ADMIN' using errcode = 'P0006';
    end if;
  end if;

  update public.profiles
  set role = p_role, updated_at = now()
  where id = p_user_id
  returning updated_at into v_updated_at;

  insert into public.admin_logs (actor_id, action, target_type, target_id, metadata)
  values (
    v_actor_id,
    'user.role_changed',
    'user',
    p_user_id::text,
    jsonb_build_object('previous_role', v_target.role, 'new_role', p_role)
  )
  returning id into v_audit_log_id;

  return jsonb_build_object(
    'userId', p_user_id,
    'role', p_role,
    'updatedAt', v_updated_at,
    'auditLogId', v_audit_log_id
  );
end;
$$;

create or replace function public.admin_change_user_status(
  p_user_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target public.profiles%rowtype;
  v_active_admin_count integer;
  v_audit_log_id bigint;
  v_updated_at timestamptz;
begin
  if v_actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and role = 'admin' and is_active = true
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0003';
  end if;

  perform id
  from public.profiles
  where role = 'admin' and is_active = true
  order by id
  for update;

  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and role = 'admin' and is_active = true
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0003';
  end if;

  select * into v_target
  from public.profiles
  where id = p_user_id
  for update;

  if v_target.id is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_target.role = 'admin' and v_target.is_active and not p_is_active then
    select count(*) into v_active_admin_count
    from public.profiles
    where role = 'admin' and is_active = true;

    if v_active_admin_count <= 1 then
      raise exception 'LAST_ACTIVE_ADMIN' using errcode = 'P0006';
    end if;
  end if;

  update public.profiles
  set is_active = p_is_active, updated_at = now()
  where id = p_user_id
  returning updated_at into v_updated_at;

  insert into public.admin_logs (actor_id, action, target_type, target_id, metadata)
  values (
    v_actor_id,
    case when p_is_active then 'user.activated' else 'user.deactivated' end,
    'user',
    p_user_id::text,
    jsonb_build_object('previous_is_active', v_target.is_active, 'new_is_active', p_is_active)
  )
  returning id into v_audit_log_id;

  return jsonb_build_object(
    'userId', p_user_id,
    'isActive', p_is_active,
    'updatedAt', v_updated_at,
    'auditLogId', v_audit_log_id
  );
end;
$$;

revoke all on function public.admin_change_user_role(uuid, public.user_role) from public;
revoke all on function public.admin_change_user_role(uuid, public.user_role) from anon;
grant execute on function public.admin_change_user_role(uuid, public.user_role) to authenticated;

revoke all on function public.admin_change_user_status(uuid, boolean) from public;
revoke all on function public.admin_change_user_status(uuid, boolean) from anon;
grant execute on function public.admin_change_user_status(uuid, boolean) to authenticated;
