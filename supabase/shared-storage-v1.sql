create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recipes (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text default '',
  recipe_type text default '',
  canonical_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id) on delete cascade,
  is_favorite boolean not null default false,
  is_active boolean not null default false,
  last_opened_at timestamptz not null default timezone('utc', now()),
  scale_factor numeric(10,4) not null default 1,
  locked_ingredients_json jsonb not null default '[]'::jsonb,
  manual_categories boolean not null default false,
  user_categories_json jsonb not null default '[]'::jsonb,
  notes_text text default '',
  saved_group text default '',
  current_step integer not null default 0,
  source text default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_recipes_user_recipe_unique unique (user_id, recipe_id)
);

create index if not exists idx_recipes_owner_user_id on public.recipes(owner_user_id);
create index if not exists idx_user_recipes_user_last_opened on public.user_recipes(user_id, last_opened_at desc);
create index if not exists idx_user_recipes_user_active on public.user_recipes(user_id, is_active);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_recipes_updated_at on public.user_recipes;
create trigger set_user_recipes_updated_at
before update on public.user_recipes
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.user_recipes enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "recipes_select_own" on public.recipes;
create policy "recipes_select_own"
on public.recipes
for select
using (auth.uid() = owner_user_id);

drop policy if exists "recipes_insert_own" on public.recipes;
create policy "recipes_insert_own"
on public.recipes
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "recipes_update_own" on public.recipes;
create policy "recipes_update_own"
on public.recipes
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "recipes_delete_own" on public.recipes;
create policy "recipes_delete_own"
on public.recipes
for delete
using (auth.uid() = owner_user_id);

drop policy if exists "user_recipes_select_own" on public.user_recipes;
create policy "user_recipes_select_own"
on public.user_recipes
for select
using (auth.uid() = user_id);

drop policy if exists "user_recipes_insert_own" on public.user_recipes;
create policy "user_recipes_insert_own"
on public.user_recipes
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_recipes_update_own" on public.user_recipes;
create policy "user_recipes_update_own"
on public.user_recipes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_recipes_delete_own" on public.user_recipes;
create policy "user_recipes_delete_own"
on public.user_recipes
for delete
using (auth.uid() = user_id);
