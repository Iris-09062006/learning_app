create index if not exists idx_admin_logs_actor_created
  on public.admin_logs(actor_id, created_at desc);

create index if not exists idx_admin_logs_target
  on public.admin_logs(target_type, target_id, created_at desc);

alter table public.admin_logs enable row level security;

create policy "Admins can view admin logs"
  on public.admin_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role = 'admin'
    )
  );

-- Note: INSERTs are only performed via server-side service role or security definer RPC functions.