-- Créer l'enum pour les rôles
create type public.app_role as enum ('admin', 'moderator', 'user');

-- Créer la table user_roles
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (user_id, role)
);

-- Activer RLS sur user_roles
alter table public.user_roles enable row level security;

-- Fonction pour vérifier les rôles (SECURITY DEFINER pour éviter les problèmes récursifs)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Policies RLS pour user_roles
create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert roles"
on public.user_roles
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update roles"
on public.user_roles
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
on public.user_roles
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Créer la table tags
create table public.tags (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    color text not null default '#3B82F6',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tags enable row level security;

create policy "Anyone can view tags"
on public.tags
for select
to authenticated
using (true);

create policy "Admins can manage tags"
on public.tags
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Créer la table tasks
create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
    due_date timestamp with time zone,
    created_by uuid references auth.users(id) on delete cascade not null,
    assigned_to uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

create policy "Users can view their tasks"
on public.tasks
for select
to authenticated
using (auth.uid() = created_by or auth.uid() = assigned_to);

create policy "Admins can view all tasks"
on public.tasks
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Users can create tasks"
on public.tasks
for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Users can update their tasks"
on public.tasks
for update
to authenticated
using (auth.uid() = created_by or auth.uid() = assigned_to);

create policy "Admins can manage all tasks"
on public.tasks
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Créer la table task_tags
create table public.task_tags (
    id uuid primary key default gen_random_uuid(),
    task_id uuid references public.tasks(id) on delete cascade not null,
    tag_id uuid references public.tags(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (task_id, tag_id)
);

alter table public.task_tags enable row level security;

create policy "Users can view task tags for their tasks"
on public.task_tags
for select
to authenticated
using (
    exists (
        select 1 from public.tasks
        where tasks.id = task_tags.task_id
        and (tasks.created_by = auth.uid() or tasks.assigned_to = auth.uid())
    )
);

create policy "Admins can view all task tags"
on public.task_tags
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Users can manage tags for their tasks"
on public.task_tags
for all
to authenticated
using (
    exists (
        select 1 from public.tasks
        where tasks.id = task_tags.task_id
        and (tasks.created_by = auth.uid() or tasks.assigned_to = auth.uid())
    )
)
with check (
    exists (
        select 1 from public.tasks
        where tasks.id = task_tags.task_id
        and (tasks.created_by = auth.uid() or tasks.assigned_to = auth.uid())
    )
);

create policy "Admins can manage all task tags"
on public.task_tags
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Créer la table task_attachments
create table public.task_attachments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid references public.tasks(id) on delete cascade not null,
    file_name text not null,
    file_path text not null,
    file_size bigint,
    mime_type text,
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.task_attachments enable row level security;

create policy "Users can view attachments for their tasks"
on public.task_attachments
for select
to authenticated
using (
    exists (
        select 1 from public.tasks
        where tasks.id = task_attachments.task_id
        and (tasks.created_by = auth.uid() or tasks.assigned_to = auth.uid())
    )
);

create policy "Admins can view all attachments"
on public.task_attachments
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Users can upload attachments to their tasks"
on public.task_attachments
for insert
to authenticated
with check (
    exists (
        select 1 from public.tasks
        where tasks.id = task_attachments.task_id
        and (tasks.created_by = auth.uid() or tasks.assigned_to = auth.uid())
    )
);

create policy "Users can delete their attachments"
on public.task_attachments
for delete
to authenticated
using (auth.uid() = uploaded_by);

create policy "Admins can manage all attachments"
on public.task_attachments
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Créer le bucket de stockage pour les pièces jointes
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false);

-- RLS policies pour le storage
create policy "Users can view attachments for their tasks"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'task-attachments' and
    exists (
        select 1 from public.task_attachments ta
        join public.tasks t on t.id = ta.task_id
        where ta.file_path = storage.objects.name
        and (t.created_by = auth.uid() or t.assigned_to = auth.uid())
    )
);

create policy "Admins can view all task attachments"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'task-attachments' and
    public.has_role(auth.uid(), 'admin')
);

create policy "Users can upload attachments to their tasks"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'task-attachments');

create policy "Users can delete their attachments"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'task-attachments' and
    exists (
        select 1 from public.task_attachments
        where file_path = storage.objects.name
        and uploaded_by = auth.uid()
    )
);

create policy "Admins can manage all task attachments"
on storage.objects
for all
to authenticated
using (
    bucket_id = 'task-attachments' and
    public.has_role(auth.uid(), 'admin')
)
with check (
    bucket_id = 'task-attachments' and
    public.has_role(auth.uid(), 'admin')
);

-- Fonction trigger pour mettre à jour updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Trigger pour tasks
create trigger set_updated_at
before update on public.tasks
for each row
execute function public.handle_updated_at();