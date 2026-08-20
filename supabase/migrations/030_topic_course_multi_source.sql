-- Additive, backward-compatible ownership support for Course imports with one to eight sources.
-- The legacy source-document insert path continues to initialize one Course-import job.

alter table public.source_documents
  add column initialize_import_job boolean not null default true;

alter table public.course_import_jobs
  add column initialization_key uuid,
  add column initialization_fingerprint text,
  add constraint course_import_initialization_pair_valid check (
    (initialization_key is null and initialization_fingerprint is null)
    or (initialization_key is not null and char_length(initialization_fingerprint) = 32)
  );

create unique index course_import_jobs_initialization_key_unique
  on public.course_import_jobs (initialization_key)
  where initialization_key is not null;

create table public.source_document_metadata (
  source_document_id bigint primary key references public.source_documents(id) on delete cascade,
  source_type text not null,
  ingestion_method text not null,
  source_url text,
  canonical_url text,
  title text not null,
  domain text,
  authority_score numeric,
  discovered_from_source_document_id bigint references public.source_documents(id) on delete set null,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  constraint source_document_metadata_type_valid check (source_type in ('file', 'web_page')),
  constraint source_document_metadata_ingestion_valid check (
    ingestion_method in ('uploaded', 'manual_url', 'discovered')
  ),
  constraint source_document_metadata_title_not_blank check (char_length(trim(title)) between 1 and 500),
  constraint source_document_metadata_authority_valid check (
    authority_score is null or authority_score between 0 and 1
  ),
  constraint source_document_metadata_provenance_valid check (
    (
      source_type = 'file'
      and ingestion_method = 'uploaded'
      and source_url is null
      and canonical_url is null
      and domain is null
      and fetched_at is null
    )
    or (
      source_type = 'web_page'
      and ingestion_method in ('manual_url', 'discovered')
      and char_length(trim(source_url)) > 0
      and char_length(trim(canonical_url)) > 0
      and char_length(trim(domain)) > 0
      and fetched_at is not null
    )
  )
);

create index source_document_metadata_canonical_url_idx
  on public.source_document_metadata (canonical_url)
  where canonical_url is not null;
create index source_document_metadata_discovered_from_idx
  on public.source_document_metadata (discovered_from_source_document_id)
  where discovered_from_source_document_id is not null;

create table public.course_import_job_sources (
  job_id bigint not null references public.course_import_jobs(id) on delete cascade,
  source_document_id bigint not null references public.source_documents(id) on delete restrict,
  source_order integer not null,
  relevance_score numeric,
  added_at timestamptz not null default now(),
  primary key (job_id, source_document_id),
  constraint course_import_job_sources_source_exclusive unique (source_document_id),
  constraint course_import_job_sources_order_unique unique (job_id, source_order)
    deferrable initially immediate,
  constraint course_import_job_sources_order_valid check (source_order between 0 and 7),
  constraint course_import_job_sources_relevance_valid check (
    relevance_score is null or relevance_score between 0 and 1
  )
);

create index course_import_job_sources_job_order_idx
  on public.course_import_job_sources (job_id, source_order);

alter table public.source_document_metadata enable row level security;
alter table public.course_import_job_sources enable row level security;

revoke all on table public.source_document_metadata, public.course_import_job_sources
  from anon, authenticated;
grant select on table public.source_document_metadata, public.course_import_job_sources
  to authenticated;

create policy "Active admins view source document metadata"
  on public.source_document_metadata for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role = 'admin'
  ));

create policy "Active admins view Course import sources"
  on public.course_import_job_sources for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role = 'admin'
  ));

-- Backfill metadata and ownership without touching any historical revision/publication row.
insert into public.source_document_metadata (
  source_document_id, source_type, ingestion_method, title
)
select source.id, 'file', 'uploaded', source.original_filename
from public.source_documents source
on conflict (source_document_id) do nothing;

insert into public.course_import_job_sources (job_id, source_document_id, source_order)
select job.id, job.source_document_id, 0
from public.course_import_jobs job
on conflict (source_document_id) do nothing;

do $$
begin
  if exists (
    select 1 from public.source_documents source
    where not exists (
      select 1 from public.source_document_metadata metadata
      where metadata.source_document_id = source.id
    )
  ) then
    raise exception 'SOURCE_METADATA_BACKFILL_INCOMPLETE';
  end if;
  if exists (
    select 1 from public.course_import_jobs job
    left join public.course_import_job_sources bridge
      on bridge.job_id = job.id and bridge.source_order = 0
    where bridge.source_document_id is distinct from job.source_document_id
  ) then
    raise exception 'COURSE_IMPORT_ANCHOR_BACKFILL_INVALID';
  end if;
  if exists (
    select job_id from public.course_import_job_sources
    group by job_id having count(*) not between 1 and 8
  ) then
    raise exception 'COURSE_IMPORT_SOURCE_COUNT_INVALID';
  end if;
end;
$$;

create or replace function public.assert_course_import_anchor_consistency()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_job_id bigint;
begin
  if tg_table_name = 'course_import_jobs' then
    v_job_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    v_job_id := case when tg_op = 'DELETE' then old.job_id else new.job_id end;
  end if;
  if exists (select 1 from public.course_import_jobs where id = v_job_id)
    and not exists (
      select 1
      from public.course_import_jobs job
      join public.course_import_job_sources bridge
        on bridge.job_id = job.id
       and bridge.source_order = 0
       and bridge.source_document_id = job.source_document_id
      where job.id = v_job_id
    )
  then
    raise exception 'COURSE_IMPORT_ANCHOR_DRIFT' using errcode = 'P0005';
  end if;
  return coalesce(new, old);
end;
$$;

create constraint trigger course_import_job_anchor_consistency
  after insert or update of source_document_id on public.course_import_jobs
  deferrable initially deferred
  for each row execute function public.assert_course_import_anchor_consistency();

create constraint trigger course_import_bridge_anchor_consistency
  after insert or update or delete on public.course_import_job_sources
  deferrable initially deferred
  for each row execute function public.assert_course_import_anchor_consistency();

create or replace function public.prevent_course_import_initialization_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.initialization_key is distinct from old.initialization_key
    or new.initialization_fingerprint is distinct from old.initialization_fingerprint
  then
    raise exception 'COURSE_IMPORT_INITIALIZATION_IMMUTABLE' using errcode = 'P0004';
  end if;
  return new;
end;
$$;

create trigger prevent_course_import_initialization_change
  before update of initialization_key, initialization_fingerprint on public.course_import_jobs
  for each row execute function public.prevent_course_import_initialization_change();

-- Preserve the legacy default insert behavior and dual-write its order-zero bridge.
create or replace function public.initialize_course_import_job()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_job_id bigint;
begin
  if not new.initialize_import_job then
    return new;
  end if;

  insert into public.source_document_metadata (
    source_document_id, source_type, ingestion_method, title
  ) values (new.id, 'file', 'uploaded', new.original_filename)
  on conflict (source_document_id) do nothing;

  insert into public.course_import_jobs (source_document_id, requested_by, status)
  values (new.id, new.uploaded_by, 'uploaded')
  on conflict (source_document_id) do update set source_document_id = excluded.source_document_id
  returning id into v_job_id;

  insert into public.course_import_job_sources (job_id, source_document_id, source_order)
  values (v_job_id, new.id, 0)
  on conflict (source_document_id) do nothing;
  return new;
end;
$$;

revoke all on function public.initialize_course_import_job() from public, anon, authenticated;

create or replace function public.materialize_course_import_source(
  p_original_filename text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_source_type text,
  p_ingestion_method text,
  p_source_url text default null,
  p_canonical_url text default null,
  p_title text default null,
  p_domain text default null,
  p_authority_score numeric default null,
  p_discovered_from_source_document_id bigint default null,
  p_fetched_at timestamptz default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_source public.source_documents%rowtype;
  v_metadata public.source_document_metadata%rowtype;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;

  if char_length(trim(p_original_filename)) not between 1 and 255
    or char_length(trim(p_storage_path)) < 1
    or p_size_bytes not between 1 and 10485760
    or p_mime_type not in (
      'text/plain', 'text/markdown', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  then raise exception 'SOURCE_INVALID' using errcode = 'P0001'; end if;

  if not (
    (p_source_type = 'file' and p_ingestion_method = 'uploaded'
      and p_source_url is null and p_canonical_url is null and p_domain is null and p_fetched_at is null)
    or
    (p_source_type = 'web_page' and p_ingestion_method in ('manual_url', 'discovered')
      and char_length(trim(p_source_url)) > 0 and char_length(trim(p_canonical_url)) > 0
      and char_length(trim(p_title)) > 0 and char_length(trim(p_domain)) > 0 and p_fetched_at is not null)
  ) then raise exception 'PROVENANCE_INVALID' using errcode = 'P0001'; end if;

  select * into v_source from public.source_documents
  where storage_path = trim(p_storage_path) for update;
  if found then
    if v_source.uploaded_by <> v_actor_id or v_source.initialize_import_job
      or v_source.original_filename <> trim(p_original_filename)
      or v_source.mime_type <> p_mime_type or v_source.size_bytes <> p_size_bytes
    then raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0009'; end if;
    select * into v_metadata from public.source_document_metadata
    where source_document_id = v_source.id;
    if not found or v_metadata.source_type <> p_source_type
      or v_metadata.ingestion_method <> p_ingestion_method
      or v_metadata.source_url is distinct from p_source_url
      or v_metadata.canonical_url is distinct from p_canonical_url
      or v_metadata.title <> coalesce(nullif(trim(p_title), ''), trim(p_original_filename))
      or v_metadata.domain is distinct from p_domain
      or v_metadata.authority_score is distinct from p_authority_score
      or v_metadata.discovered_from_source_document_id is distinct from p_discovered_from_source_document_id
      or v_metadata.fetched_at is distinct from p_fetched_at
    then raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0009'; end if;
  else
    if p_discovered_from_source_document_id is not null and not exists (
      select 1 from public.source_documents parent
      where parent.id = p_discovered_from_source_document_id and parent.uploaded_by = v_actor_id
    ) then raise exception 'SOURCE_OWNERSHIP_INVALID' using errcode = 'P0005'; end if;

    insert into public.source_documents (
      uploaded_by, original_filename, storage_path, mime_type, size_bytes, initialize_import_job
    ) values (
      v_actor_id, trim(p_original_filename), trim(p_storage_path), p_mime_type, p_size_bytes, false
    ) returning * into v_source;

    insert into public.source_document_metadata (
      source_document_id, source_type, ingestion_method, source_url, canonical_url, title,
      domain, authority_score, discovered_from_source_document_id, fetched_at
    ) values (
      v_source.id, p_source_type, p_ingestion_method, p_source_url, p_canonical_url,
      coalesce(nullif(trim(p_title), ''), trim(p_original_filename)), p_domain,
      p_authority_score, p_discovered_from_source_document_id, p_fetched_at
    );
  end if;

  return jsonb_build_object(
    'sourceDocumentId', v_source.id,
    'status', v_source.status,
    'jobId', (select bridge.job_id from public.course_import_job_sources bridge
      where bridge.source_document_id = v_source.id),
    'attached', exists (select 1 from public.course_import_job_sources bridge
      where bridge.source_document_id = v_source.id)
  );
end;
$$;

create or replace function public.initialize_course_import_from_sources(
  p_initialization_key uuid,
  p_sources jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_job public.course_import_jobs%rowtype;
  v_fingerprint text;
  v_anchor_id bigint;
  v_source_count integer;
  v_locked_count integer;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  if p_initialization_key is null or jsonb_typeof(p_sources) <> 'array'
  then raise exception 'INITIALIZATION_INVALID' using errcode = 'P0001'; end if;

  v_source_count := jsonb_array_length(p_sources);
  if v_source_count not between 1 and 8
  then raise exception 'SOURCE_COUNT_INVALID' using errcode = 'P0001'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_sources) item
    where jsonb_typeof(item) <> 'object'
      or not (item ? 'sourceDocumentId')
      or (item ? 'relevanceScore' and (item->>'relevanceScore')::numeric not between 0 and 1)
  ) or (
    select count(distinct (item->>'sourceDocumentId')::bigint)
    from jsonb_array_elements(p_sources) item
  ) <> v_source_count
  then raise exception 'INITIALIZATION_INVALID' using errcode = 'P0001'; end if;

  select md5(jsonb_agg(jsonb_build_object(
    'sourceDocumentId', (item.value->>'sourceDocumentId')::bigint,
    'relevanceScore', case when item.value ? 'relevanceScore'
      then (item.value->>'relevanceScore')::numeric else null end,
    'sourceType', metadata.source_type,
    'ingestionMethod', metadata.ingestion_method,
    'canonicalUrl', metadata.canonical_url
  ) order by item.ordinality)::text),
  (jsonb_array_element(p_sources, 0)->>'sourceDocumentId')::bigint
  into v_fingerprint, v_anchor_id
  from jsonb_array_elements(p_sources) with ordinality item(value, ordinality)
  left join public.source_document_metadata metadata
    on metadata.source_document_id = (item.value->>'sourceDocumentId')::bigint;

  select * into v_job from public.course_import_jobs
  where initialization_key = p_initialization_key;
  if found then
    if v_job.initialization_fingerprint <> v_fingerprint
    then raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0009'; end if;
    return jsonb_build_object('jobId', v_job.id, 'sourceDocumentId', v_job.source_document_id,
      'sourceDocumentIds', (select jsonb_agg(source_document_id order by source_order)
        from public.course_import_job_sources where job_id = v_job.id), 'status', v_job.status);
  end if;

  -- Deterministic row locking serializes overlapping sets and truly concurrent duplicate calls.
  perform source.id
  from public.source_documents source
  join jsonb_array_elements(p_sources) item
    on source.id = (item->>'sourceDocumentId')::bigint
  order by source.id
  for update of source;
  get diagnostics v_locked_count = row_count;
  if v_locked_count <> v_source_count
  then raise exception 'SOURCE_NOT_FOUND' using errcode = 'P0002'; end if;

  -- A duplicate request may have completed while this transaction waited for its source locks.
  select * into v_job from public.course_import_jobs
  where initialization_key = p_initialization_key;
  if found then
    if v_job.initialization_fingerprint <> v_fingerprint
    then raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0009'; end if;
    return jsonb_build_object('jobId', v_job.id, 'sourceDocumentId', v_job.source_document_id,
      'sourceDocumentIds', (select jsonb_agg(source_document_id order by source_order)
        from public.course_import_job_sources where job_id = v_job.id), 'status', v_job.status);
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sources) item
    left join public.source_documents source on source.id = (item->>'sourceDocumentId')::bigint
    where source.uploaded_by <> v_actor_id
      or source.initialize_import_job
      or source.status <> 'extracted'
      or not exists (select 1 from public.document_chunks chunk where chunk.source_document_id = source.id)
      or not exists (select 1 from public.source_document_metadata metadata where metadata.source_document_id = source.id)
      or exists (select 1 from public.course_import_job_sources bridge where bridge.source_document_id = source.id)
  ) then raise exception 'SOURCE_NOT_USABLE' using errcode = 'P0005'; end if;

  insert into public.course_import_jobs (
    source_document_id, requested_by, status, initialization_key, initialization_fingerprint
  ) values (v_anchor_id, v_actor_id, 'uploaded', p_initialization_key, v_fingerprint)
  returning * into v_job;

  insert into public.course_import_job_sources (
    job_id, source_document_id, source_order, relevance_score
  )
  select v_job.id, (item.value->>'sourceDocumentId')::bigint, item.ordinality::integer - 1,
    case when item.value ? 'relevanceScore' then (item.value->>'relevanceScore')::numeric else null end
  from jsonb_array_elements(p_sources) with ordinality item(value, ordinality)
  order by item.ordinality;

  return jsonb_build_object('jobId', v_job.id, 'sourceDocumentId', v_anchor_id,
    'sourceDocumentIds', (select jsonb_agg(source_document_id order by source_order)
      from public.course_import_job_sources where job_id = v_job.id), 'status', v_job.status);
end;
$$;

create or replace function public.attach_course_import_source(
  p_job_id bigint,
  p_source_document_id bigint,
  p_relevance_score numeric default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_job public.course_import_jobs%rowtype;
  v_source public.source_documents%rowtype;
  v_order integer;
  v_existing_job_id bigint;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  if p_relevance_score is not null and p_relevance_score not between 0 and 1
  then raise exception 'RELEVANCE_INVALID' using errcode = 'P0001'; end if;

  select * into v_job from public.course_import_jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  select job_id into v_existing_job_id from public.course_import_job_sources
  where source_document_id = p_source_document_id;
  if found then
    if v_existing_job_id <> p_job_id
    then raise exception 'SOURCE_ALREADY_OWNED' using errcode = 'P0009'; end if;
    return jsonb_build_object('jobId', p_job_id, 'sourceDocumentId', p_source_document_id,
      'sourceOrder', (select source_order from public.course_import_job_sources
        where job_id = p_job_id and source_document_id = p_source_document_id), 'attached', true);
  end if;
  if v_job.approved_outline_revision is not null
    or v_job.status in ('generating_content', 'content_review', 'ready_to_publish', 'published', 'rejected')
  then raise exception 'EVIDENCE_LOCKED' using errcode = 'P0004'; end if;

  select * into v_source from public.source_documents where id = p_source_document_id for update;
  if not found then raise exception 'SOURCE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_source.uploaded_by <> v_actor_id or v_source.initialize_import_job
    or v_source.status not in ('extracted', 'ready_for_review')
    or not exists (select 1 from public.document_chunks where source_document_id = v_source.id)
  then raise exception 'SOURCE_NOT_USABLE' using errcode = 'P0005'; end if;
  select count(*) into v_order from public.course_import_job_sources where job_id = p_job_id;
  if v_order >= 8 then raise exception 'SOURCE_LIMIT_EXCEEDED' using errcode = 'P0004'; end if;

  insert into public.course_import_job_sources (job_id, source_document_id, source_order, relevance_score)
  values (p_job_id, p_source_document_id, v_order, p_relevance_score);
  if v_job.current_outline_revision > 0 then
    update public.course_import_jobs set status = 'processing', approved_outline_revision = null,
      error_code = null where id = p_job_id;
  end if;
  return jsonb_build_object('jobId', p_job_id, 'sourceDocumentId', p_source_document_id,
    'sourceOrder', v_order, 'attached', true,
    'outlineStale', v_job.current_outline_revision > 0);
end;
$$;

create or replace function public.detach_course_import_source(
  p_job_id bigint,
  p_source_document_id bigint
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_job public.course_import_jobs%rowtype;
  v_removed_order integer;
  v_count integer;
  v_anchor_id bigint;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  select * into v_job from public.course_import_jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_job.approved_outline_revision is not null
    or v_job.status in ('generating_content', 'content_review', 'ready_to_publish', 'published', 'rejected')
  then raise exception 'EVIDENCE_LOCKED' using errcode = 'P0004'; end if;
  select source_order into v_removed_order from public.course_import_job_sources
  where job_id = p_job_id and source_document_id = p_source_document_id for update;
  if not found then raise exception 'SOURCE_NOT_ATTACHED' using errcode = 'P0002'; end if;
  select count(*) into v_count from public.course_import_job_sources where job_id = p_job_id;
  if v_count <= 1 then raise exception 'LAST_SOURCE_REQUIRED' using errcode = 'P0004'; end if;

  delete from public.course_import_job_sources
  where job_id = p_job_id and source_document_id = p_source_document_id;
  set constraints public.course_import_job_sources_order_unique deferred;
  update public.course_import_job_sources set source_order = source_order - 1
  where job_id = p_job_id and source_order > v_removed_order;
  select source_document_id into v_anchor_id from public.course_import_job_sources
  where job_id = p_job_id and source_order = 0;
  update public.course_import_jobs set source_document_id = v_anchor_id,
    status = case when current_outline_revision > 0 then 'processing'::public.course_import_status else status end,
    approved_outline_revision = null, error_code = null
  where id = p_job_id;

  return jsonb_build_object('jobId', p_job_id, 'sourceDocumentId', p_source_document_id,
    'sourceDocumentIds', (select jsonb_agg(source_document_id order by source_order)
      from public.course_import_job_sources where job_id = p_job_id),
    'anchorSourceDocumentId', v_anchor_id, 'outlineStale', v_job.current_outline_revision > 0);
end;
$$;

create or replace function public.remove_staged_course_import_source(p_source_document_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_source public.source_documents%rowtype;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  select * into v_source from public.source_documents where id = p_source_document_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_source.uploaded_by <> v_actor_id or v_source.initialize_import_job
    or exists (select 1 from public.course_import_job_sources where source_document_id = v_source.id)
    or exists (select 1 from public.lesson_drafts where source_document_id = v_source.id)
    or exists (
      select 1 from public.course_outline_lesson_sources outline_source
      join public.document_chunks chunk on chunk.id = outline_source.document_chunk_id
      where chunk.source_document_id = v_source.id
    )
    or exists (
      select 1 from public.lesson_content_draft_citations citation
      join public.document_chunks chunk on chunk.id = citation.document_chunk_id
      where chunk.source_document_id = v_source.id
    )
  then raise exception 'SOURCE_REMOVAL_FORBIDDEN' using errcode = 'P0004'; end if;
  delete from public.source_documents where id = v_source.id;
  return jsonb_build_object('sourceDocumentId', v_source.id, 'storageBucket', v_source.storage_bucket,
    'storagePath', v_source.storage_path, 'removed', true);
end;
$$;

create or replace function public.create_course_outline_for_job(
  p_job_id bigint,
  p_outline jsonb,
  p_provider text,
  p_model text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_job public.course_import_jobs%rowtype;
  v_draft_id bigint;
  v_revision integer;
  v_item jsonb;
  v_lesson jsonb;
  v_outline_lesson_id bigint;
  v_order integer;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  select * into v_job from public.course_import_jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_job.status in ('published', 'rejected', 'generating_content', 'content_review', 'ready_to_publish')
    or v_job.approved_outline_revision is not null
  then raise exception 'JOB_STATE_INVALID' using errcode = 'P0004'; end if;
  if not exists (select 1 from public.course_import_job_sources where job_id = p_job_id)
  then raise exception 'SOURCE_NOT_USABLE' using errcode = 'P0006'; end if;
  if jsonb_typeof(p_outline) <> 'object'
    or char_length(trim(p_outline->>'title')) not between 1 and 150
    or coalesce(char_length(trim(p_outline->>'description')), 0) < 1
    or jsonb_typeof(p_outline->'learningObjectives') <> 'array'
    or jsonb_array_length(p_outline->'learningObjectives') < 1
    or jsonb_typeof(p_outline->'lessons') <> 'array'
    or jsonb_array_length(p_outline->'lessons') not between 2 and 20
  then raise exception 'OUTLINE_INVALID' using errcode = 'P0001'; end if;

  v_revision := v_job.current_outline_revision + 1;
  insert into public.course_drafts (job_id, revision, title, description, provider, model)
  values (v_job.id, v_revision, trim(p_outline->>'title'), trim(p_outline->>'description'), p_provider, p_model)
  returning id into v_draft_id;
  v_order := 0;
  for v_item in select value from jsonb_array_elements(p_outline->'learningObjectives') loop
    v_order := v_order + 1;
    insert into public.course_draft_objectives (course_draft_id, objective_order, objective)
    values (v_draft_id, v_order, trim(v_item #>> '{}'));
  end loop;

  v_order := 0;
  for v_lesson in select value from jsonb_array_elements(p_outline->'lessons') loop
    v_order := v_order + 1;
    if jsonb_typeof(v_lesson) <> 'object'
      or char_length(trim(v_lesson->>'clientKey')) not between 1 and 80
      or char_length(trim(v_lesson->>'title')) not between 1 and 150
      or coalesce(char_length(trim(v_lesson->>'summary')), 0) < 1
      or jsonb_typeof(v_lesson->'learningObjectives') <> 'array'
      or jsonb_array_length(v_lesson->'learningObjectives') < 1
      or jsonb_typeof(v_lesson->'sourceChunkIds') <> 'array'
      or jsonb_array_length(v_lesson->'sourceChunkIds') < 1
    then raise exception 'OUTLINE_LESSON_INVALID' using errcode = 'P0001'; end if;
    insert into public.course_outline_lessons (course_draft_id, client_key, lesson_order, title, summary)
    values (v_draft_id, trim(v_lesson->>'clientKey'), v_order,
      trim(v_lesson->>'title'), trim(v_lesson->>'summary')) returning id into v_outline_lesson_id;
    insert into public.course_outline_lesson_objectives (outline_lesson_id, objective_order, objective)
    select v_outline_lesson_id, ordinality::integer, trim(value #>> '{}')
    from jsonb_array_elements(v_lesson->'learningObjectives') with ordinality;
    insert into public.course_outline_lesson_sources (outline_lesson_id, document_chunk_id, source_order)
    select v_outline_lesson_id, chunk.id, ref.ordinality::integer - 1
    from jsonb_array_elements(v_lesson->'sourceChunkIds') with ordinality ref(value, ordinality)
    join public.document_chunks chunk on chunk.id = (ref.value #>> '{}')::bigint
    join public.course_import_job_sources bridge
      on bridge.job_id = p_job_id and bridge.source_document_id = chunk.source_document_id;
    if (select count(*) from public.course_outline_lesson_sources where outline_lesson_id = v_outline_lesson_id)
      <> jsonb_array_length(v_lesson->'sourceChunkIds')
    then raise exception 'OUTLINE_SOURCE_INVALID' using errcode = 'P0007'; end if;
  end loop;

  update public.course_import_jobs set status = 'outline_review', current_outline_revision = v_revision,
    approved_outline_revision = null, error_code = null where id = v_job.id;
  update public.source_documents source set status = 'ready_for_review', error_code = null
  from public.course_import_job_sources bridge
  where bridge.job_id = v_job.id and bridge.source_document_id = source.id;
  insert into public.admin_logs (actor_id, action, target_type, target_id, metadata)
  values (v_actor_id, 'course_import.outline_generated', 'course_import_job', v_job.id::text,
    jsonb_build_object('source_document_ids', (select jsonb_agg(source_document_id order by source_order)
      from public.course_import_job_sources where job_id = v_job.id), 'outline_revision', v_revision));
  return jsonb_build_object('jobId', v_job.id, 'sourceDocumentId', v_job.source_document_id,
    'sourceDocumentIds', (select jsonb_agg(source_document_id order by source_order)
      from public.course_import_job_sources where job_id = v_job.id),
    'outlineRevision', v_revision, 'status', 'outline_review');
end;
$$;

-- Legacy single-source wrapper: bare chunk indexes are resolved only against the anchor source.
create or replace function public.create_course_outline(
  p_source_document_id bigint,
  p_outline jsonb,
  p_provider text,
  p_model text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid();
  v_job_id bigint;
  v_lesson jsonb;
  v_lessons jsonb := '[]'::jsonb;
  v_chunk_ids jsonb;
  v_outline jsonb;
begin
  if v_actor_id is null then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  perform 1 from public.source_documents where id = p_source_document_id and status = 'generating' for update;
  if not found then raise exception 'SOURCE_NOT_GENERATING' using errcode = 'P0006'; end if;
  select id into v_job_id from public.course_import_jobs where source_document_id = p_source_document_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  for v_lesson in select value from jsonb_array_elements(p_outline->'lessons') loop
    select jsonb_agg(chunk.id order by ref.ordinality) into v_chunk_ids
    from jsonb_array_elements(v_lesson->'sourceChunkIndexes') with ordinality ref(value, ordinality)
    join public.document_chunks chunk on chunk.source_document_id = p_source_document_id
      and chunk.chunk_index = (ref.value #>> '{}')::integer;
    if coalesce(jsonb_array_length(v_chunk_ids), 0) <> jsonb_array_length(v_lesson->'sourceChunkIndexes')
    then raise exception 'OUTLINE_SOURCE_INVALID' using errcode = 'P0007'; end if;
    v_lessons := v_lessons || jsonb_build_array(v_lesson || jsonb_build_object('sourceChunkIds', v_chunk_ids));
  end loop;
  v_outline := jsonb_set(p_outline, '{lessons}', v_lessons);
  return public.create_course_outline_for_job(v_job_id, v_outline, p_provider, p_model);
end;
$$;

create or replace function public.persist_lesson_content_draft_for_job(
  p_job_id bigint, p_outline_lesson_id bigint, p_title text, p_summary text,
  p_estimated_minutes integer, p_sections jsonb, p_citations jsonb,
  p_provider text, p_model text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid(); v_job public.course_import_jobs%rowtype;
  v_draft_id bigint; v_revision integer; v_citation jsonb; v_expected integer; v_actual integer;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  select * into v_job from public.course_import_jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_job.status <> 'generating_content' then raise exception 'JOB_STATE_INVALID' using errcode = 'P0004'; end if;
  if not exists (
    select 1 from public.course_outline_lessons lesson
    join public.course_drafts draft on draft.id = lesson.course_draft_id
    where lesson.id = p_outline_lesson_id and draft.job_id = p_job_id
      and draft.revision = v_job.approved_outline_revision
  ) then raise exception 'OUTLINE_LESSON_MISMATCH' using errcode = 'P0005'; end if;
  if char_length(trim(p_title)) not between 1 and 150 or char_length(trim(p_summary)) < 1
    or p_estimated_minutes not between 1 and 180 or jsonb_typeof(p_sections) <> 'array'
    or jsonb_array_length(p_sections) not between 1 and 12 or jsonb_typeof(p_citations) <> 'array'
  then raise exception 'LESSON_CONTENT_INVALID' using errcode = 'P0001'; end if;

  select coalesce(max(revision), 0) + 1 into v_revision from public.lesson_content_drafts
  where outline_lesson_id = p_outline_lesson_id;
  insert into public.lesson_content_drafts (
    outline_lesson_id, revision, title, summary, estimated_minutes, sections, provider, model
  ) values (p_outline_lesson_id, v_revision, trim(p_title), trim(p_summary),
    p_estimated_minutes, p_sections, p_provider, p_model) returning id into v_draft_id;

  for v_citation in select value from jsonb_array_elements(p_citations) loop
    insert into public.lesson_content_draft_citations (
      lesson_content_draft_id, section_index, document_chunk_id, quote
    )
    select v_draft_id, (v_citation->>'sectionIndex')::integer, chunk.id, left(chunk.content, 500)
    from public.document_chunks chunk
    join public.course_import_job_sources bridge
      on bridge.job_id = p_job_id and bridge.source_document_id = chunk.source_document_id
    join public.course_outline_lesson_sources allowed
      on allowed.outline_lesson_id = p_outline_lesson_id and allowed.document_chunk_id = chunk.id
    where chunk.id = (v_citation->>'documentChunkId')::bigint
      and (v_citation->>'sectionIndex')::integer between 0 and jsonb_array_length(p_sections) - 1;
    if not found then raise exception 'CITATION_INVALID' using errcode = 'P0007'; end if;
  end loop;
  select jsonb_array_length(p_sections), count(distinct section_index) into v_expected, v_actual
  from public.lesson_content_draft_citations where lesson_content_draft_id = v_draft_id;
  if v_actual <> v_expected then raise exception 'CITATIONS_INCOMPLETE' using errcode = 'P0007'; end if;
  if not exists (
    select 1 from public.course_outline_lessons lesson
    join public.course_drafts draft on draft.id = lesson.course_draft_id
    where draft.job_id = p_job_id and draft.revision = v_job.approved_outline_revision
      and not exists (select 1 from public.lesson_content_drafts content
        where content.outline_lesson_id = lesson.id and content.status = 'ready')
  ) then update public.course_import_jobs set status = 'content_review', error_code = null where id = p_job_id; end if;
  return jsonb_build_object('lessonContentDraftId', v_draft_id, 'outlineLessonId', p_outline_lesson_id,
    'revision', v_revision, 'status', 'ready');
end;
$$;

-- Legacy single-source Lesson wrapper keeps the existing sections payload and resolves anchor indexes.
create or replace function public.persist_lesson_content_draft(
  p_job_id bigint, p_outline_lesson_id bigint, p_title text, p_summary text,
  p_estimated_minutes integer, p_sections jsonb, p_provider text, p_model text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_anchor_id bigint;
  v_citations jsonb;
  v_expected_citations integer;
begin
  select source_document_id into v_anchor_id from public.course_import_jobs where id = p_job_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'sectionIndex', section.ordinality - 1, 'documentChunkId', chunk.id
  ) order by section.ordinality, citation.ordinality), '[]'::jsonb) into v_citations
  from jsonb_array_elements(p_sections) with ordinality section(value, ordinality)
  cross join jsonb_array_elements(section.value->'citationChunkIndexes') with ordinality citation(value, ordinality)
  join public.document_chunks chunk on chunk.source_document_id = v_anchor_id
    and chunk.chunk_index = (citation.value #>> '{}')::integer;
  select coalesce(sum(jsonb_array_length(section.value->'citationChunkIndexes')), 0)::integer
    into v_expected_citations from jsonb_array_elements(p_sections) section(value);
  if jsonb_array_length(v_citations) <> v_expected_citations
  then raise exception 'CITATION_INVALID' using errcode = 'P0007'; end if;
  return public.persist_lesson_content_draft_for_job(
    p_job_id, p_outline_lesson_id, p_title, p_summary, p_estimated_minutes,
    p_sections, v_citations, p_provider, p_model
  );
end;
$$;

-- Keep publication atomic/idempotent; archive every attached evidence source in the same transaction.
create or replace function public.publish_course_import_job(p_job_id bigint, p_course_slug text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := auth.uid(); v_job public.course_import_jobs%rowtype;
  v_draft public.course_drafts%rowtype; v_course public.courses%rowtype; v_chapter public.chapters%rowtype;
  v_outline_lesson public.course_outline_lessons%rowtype; v_content public.lesson_content_drafts%rowtype;
  v_lesson public.lessons%rowtype; v_publication_id bigint; v_content_text text;
  v_lesson_ids jsonb := '[]'::jsonb; v_source_ids jsonb;
begin
  if v_actor_id is null or not exists (
    select 1 from public.profiles p where p.id = v_actor_id and p.is_active and p.role = 'admin'
  ) then raise exception 'FORBIDDEN' using errcode = 'P0003'; end if;
  select * into v_job from public.course_import_jobs where id = p_job_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  select coalesce(jsonb_agg(source_document_id order by source_order), '[]'::jsonb)
    into v_source_ids from public.course_import_job_sources where job_id = v_job.id;
  if v_job.status = 'published' then
    return jsonb_build_object('jobId', v_job.id, 'sourceDocumentId', v_job.source_document_id,
      'sourceDocumentIds', v_source_ids, 'courseId', v_job.published_course_id, 'status', 'published',
      'lessonIds', (select coalesce(jsonb_agg(lesson_id order by lesson_id), '[]'::jsonb)
        from public.course_import_lesson_publications lp
        join public.course_import_publications publication on publication.id = lp.publication_id
        where publication.job_id = v_job.id));
  end if;
  if v_job.status <> 'ready_to_publish' then raise exception 'JOB_NOT_READY' using errcode = 'P0004'; end if;
  select * into v_draft from public.course_drafts
  where job_id = v_job.id and revision = v_job.approved_outline_revision;
  if not found then raise exception 'OUTLINE_NOT_APPROVED' using errcode = 'P0005'; end if;
  if char_length(trim(p_course_slug)) not between 1 and 160
    or trim(p_course_slug) !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  then raise exception 'SLUG_INVALID' using errcode = 'P0001'; end if;
  insert into public.courses (title, slug, description, is_published)
  values (v_draft.title, trim(p_course_slug), v_draft.description, true) returning * into v_course;
  insert into public.chapters (course_id, title, description, chapter_order, is_published)
  values (v_course.id, 'Nội dung chính', v_draft.description, 1, true) returning * into v_chapter;
  insert into public.course_import_publications (job_id, course_id, chapter_id, outline_revision, published_by)
  values (v_job.id, v_course.id, v_chapter.id, v_draft.revision, v_actor_id) returning id into v_publication_id;
  for v_outline_lesson in select * from public.course_outline_lessons
    where course_draft_id = v_draft.id order by lesson_order for update
  loop
    select * into v_content from public.lesson_content_drafts
    where outline_lesson_id = v_outline_lesson.id and status = 'ready'
    order by revision desc limit 1;
    if not found then raise exception 'LESSON_CONTENT_MISSING' using errcode = 'P0006'; end if;
    select string_agg('## ' || (section->>'heading') || E'\n\n' || (section->>'bodyMarkdown'),
      E'\n\n' order by ordinality) into v_content_text
    from jsonb_array_elements(v_content.sections) with ordinality as item(section, ordinality);
    insert into public.lessons (chapter_id, title, content, lesson_order, estimated_minutes, is_published)
    values (v_chapter.id, v_content.title, v_content_text, v_outline_lesson.lesson_order,
      v_content.estimated_minutes, true) returning * into v_lesson;
    insert into public.course_import_lesson_publications (
      publication_id, outline_lesson_id, lesson_content_draft_id, lesson_id
    ) values (v_publication_id, v_outline_lesson.id, v_content.id, v_lesson.id);
    v_lesson_ids := v_lesson_ids || jsonb_build_array(v_lesson.id);
  end loop;
  update public.course_import_jobs set status = 'published', published_course_id = v_course.id,
    error_code = null where id = v_job.id;
  update public.source_documents source set status = 'archived', error_code = null
  from public.course_import_job_sources bridge
  where bridge.job_id = v_job.id and bridge.source_document_id = source.id;
  insert into public.course_import_reviews (job_id, reviewer_id, outline_revision, decision)
  values (v_job.id, v_actor_id, v_draft.revision, 'published');
  insert into public.admin_logs (actor_id, action, target_type, target_id, metadata)
  values (v_actor_id, 'course_import.published', 'course_import_job', v_job.id::text,
    jsonb_build_object('course_id', v_course.id, 'lesson_ids', v_lesson_ids,
      'source_document_ids', v_source_ids));
  return jsonb_build_object('jobId', v_job.id, 'sourceDocumentId', v_job.source_document_id,
    'sourceDocumentIds', v_source_ids, 'courseId', v_course.id,
    'status', 'published', 'lessonIds', v_lesson_ids);
end;
$$;

revoke all on function public.materialize_course_import_source(text, text, text, bigint, text, text, text, text, text, text, numeric, bigint, timestamptz) from public, anon;
revoke all on function public.initialize_course_import_from_sources(uuid, jsonb) from public, anon;
revoke all on function public.attach_course_import_source(bigint, bigint, numeric) from public, anon;
revoke all on function public.detach_course_import_source(bigint, bigint) from public, anon;
revoke all on function public.remove_staged_course_import_source(bigint) from public, anon;
revoke all on function public.create_course_outline_for_job(bigint, jsonb, text, text) from public, anon;
revoke all on function public.persist_lesson_content_draft_for_job(bigint, bigint, text, text, integer, jsonb, jsonb, text, text) from public, anon;
revoke all on function public.create_course_outline(bigint, jsonb, text, text) from public, anon;
revoke all on function public.persist_lesson_content_draft(bigint, bigint, text, text, integer, jsonb, text, text) from public, anon;
revoke all on function public.publish_course_import_job(bigint, text) from public, anon;

grant execute on function public.materialize_course_import_source(text, text, text, bigint, text, text, text, text, text, text, numeric, bigint, timestamptz) to authenticated;
grant execute on function public.initialize_course_import_from_sources(uuid, jsonb) to authenticated;
grant execute on function public.attach_course_import_source(bigint, bigint, numeric) to authenticated;
grant execute on function public.detach_course_import_source(bigint, bigint) to authenticated;
grant execute on function public.remove_staged_course_import_source(bigint) to authenticated;
grant execute on function public.create_course_outline_for_job(bigint, jsonb, text, text) to authenticated;
grant execute on function public.persist_lesson_content_draft_for_job(bigint, bigint, text, text, integer, jsonb, jsonb, text, text) to authenticated;
grant execute on function public.create_course_outline(bigint, jsonb, text, text) to authenticated;
grant execute on function public.persist_lesson_content_draft(bigint, bigint, text, text, integer, jsonb, text, text) to authenticated;
grant execute on function public.publish_course_import_job(bigint, text) to authenticated;
