-- Favorites (찜) 테이블과 RLS 정책 설정
-- 타입 구분: kindergarten | childcare | hospital 등 확장 가능

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  target_type text not null check (target_type in ('kindergarten','childcare','hospital','playground')),
  target_id text not null, -- 예: kindercode, stcode 등 문자열 키
  target_name text,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

alter table public.favorites enable row level security;

-- 본인만 조회/삽입/삭제 가능
create policy favorites_select on public.favorites
  for select using (auth.uid() = user_id);

create policy favorites_insert on public.favorites
  for insert with check (auth.uid() = user_id);

create policy favorites_delete on public.favorites
  for delete using (auth.uid() = user_id);


