delete from storage.objects where bucket_id in ('bank-source-files', 'bank-export-files');
delete from public.extracted_rows;
delete from public.source_documents;
delete from public.processing_jobs;

drop policy if exists "live test storage objects" on storage.objects;
delete from storage.buckets where id in ('bank-source-files', 'bank-export-files');

drop table if exists public.export_artifacts;
drop table if exists public.extracted_rows;
drop table if exists public.source_documents;
drop table if exists public.processing_jobs;
drop table if exists public.audit_events;
drop table if exists public.storage_policies;
