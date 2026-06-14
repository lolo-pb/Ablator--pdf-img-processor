with ranked_presets as (
  select
    id,
    business_id,
    name,
    updated_at,
    version,
    first_value(id) over (
      partition by business_id, name
      order by updated_at desc, version desc, created_at desc, id desc
    ) as canonical_id,
    row_number() over (
      partition by business_id, name
      order by updated_at desc, version desc, created_at desc, id desc
    ) as preset_rank
  from public.presets
),
duplicate_presets as (
  select id, canonical_id
  from ranked_presets
  where preset_rank > 1
)
update public.processing_jobs as jobs
set preset_id = duplicates.canonical_id
from duplicate_presets as duplicates
where jobs.preset_id = duplicates.id;

delete from public.presets
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by business_id, name
        order by updated_at desc, version desc, created_at desc, id desc
      ) as preset_rank
    from public.presets
  ) ranked
  where ranked.preset_rank > 1
);
