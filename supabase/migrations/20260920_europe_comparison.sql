begin;
alter table public.migration_routes add column if not exists residency_pathway text;
alter table public.migration_routes add column if not exists pr_route text;
alter table public.migration_routes add column if not exists citizenship_timeline text;
alter table public.migration_routes add column if not exists job_opportunities text;
alter table public.migration_routes add column if not exists business_potential text;
alter table public.migration_routes add column if not exists education text;
alter table public.migration_routes add column if not exists family_suitability text;
commit;