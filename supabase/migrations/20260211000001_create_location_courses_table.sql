create table if not exists location_courses (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  unique(location_id, course_id)
);

-- Create index for fast lookups
create index if not exists idx_location_courses_location on location_courses(location_id);
create index if not exists idx_location_courses_course on location_courses(course_id);

-- Enable RLS
alter table location_courses enable row level security;

-- Create policy for read access
create policy "Enable read access for all users" on location_courses
  for select
  using (true);

-- Create policy for admin write access
create policy "Enable write for admins" on location_courses
  for all
  using (auth.jwt()->>'role' = 'admin')
  with check (auth.jwt()->>'role' = 'admin');
