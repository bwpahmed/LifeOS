begin;
alter table public.tasks add column if not exists responsible text default 'Me';
alter table public.tasks add column if not exists business_section text;
commit;