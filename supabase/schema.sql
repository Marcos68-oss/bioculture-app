-- ============================================================
-- Esquema: productos (inventario de remedios naturales / yuyos)
-- ============================================================

create table if not exists productos (
  id uuid default gen_random_uuid() primary key,
  codigo varchar(20) not null unique,
  nombre text not null,
  stock_actual int not null default 0,
  stock_minimo int not null default 5,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists productos_codigo_idx on productos (codigo);
create index if not exists productos_nombre_idx on productos using gin (to_tsvector('spanish', nombre));

-- ============================================================
-- Row Level Security
-- Solo usuarios autenticados (login de Supabase Auth) pueden
-- leer y escribir. Como es un sistema privado de un solo
-- negocio, cualquier usuario logueado tiene acceso total.
-- ============================================================

alter table productos enable row level security;

create policy "Usuarios autenticados pueden leer productos"
  on productos for select
  to authenticated
  using (true);

create policy "Usuarios autenticados pueden insertar productos"
  on productos for insert
  to authenticated
  with check (true);

create policy "Usuarios autenticados pueden actualizar productos"
  on productos for update
  to authenticated
  using (true)
  with check (true);

create policy "Usuarios autenticados pueden eliminar productos"
  on productos for delete
  to authenticated
  using (true);
