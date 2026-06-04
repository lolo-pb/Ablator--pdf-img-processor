with ranked_jobs as (
  select
    id,
    created_by,
    row_number() over (
      partition by created_by
      order by updated_at desc, created_at desc, id desc
    ) as row_num
  from public.processing_jobs
)
delete from public.processing_jobs
where id in (
  select id
  from ranked_jobs
  where row_num > 1
);

drop policy if exists "live test exports" on public.export_artifacts;
drop policy if exists "live test audits" on public.audit_events;

drop table if exists public.export_artifacts;
drop table if exists public.audit_events;

drop index if exists processing_jobs_created_by_unique;
create unique index processing_jobs_created_by_unique
on public.processing_jobs (created_by);

drop policy if exists "live test storage objects" on storage.objects;
create policy "live test storage objects"
on storage.objects for all
using (bucket_id = 'bank-source-files')
with check (bucket_id = 'bank-source-files');
