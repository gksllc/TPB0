create table appointments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  pet_id uuid references pets not null,
  service_type text not null,
  date date not null,
  time time not null,
  status text not null default 'upcoming',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table appointments enable row level security;

create policy "Users can view their own appointments"
  on appointments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own appointments"
  on appointments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own appointments"
  on appointments for update
  using (auth.uid() = user_id); 