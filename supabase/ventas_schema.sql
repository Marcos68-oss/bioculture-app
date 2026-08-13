-- ============================================================
-- Módulo de VENTAS — no modifica la tabla `productos` existente.
-- Correr esto una sola vez en el SQL Editor de Supabase.
-- ============================================================

-- Tabla de configuración: un solo interruptor (fila única, id=1)
create table if not exists app_config (
  id int primary key default 1,
  ventas_habilitado boolean not null default false,
  constraint app_config_singleton check (id = 1)
);

insert into app_config (id, ventas_habilitado)
values (1, false)
on conflict (id) do nothing;

alter table app_config enable row level security;

-- Cualquier usuario logueado puede LEER el estado del interruptor
-- (para que la app sepa si mostrar o no el módulo de ventas)
create policy "Usuarios autenticados pueden leer config"
  on app_config for select
  to authenticated
  using (true);

-- A PROPÓSITO no hay policy de UPDATE aquí.
-- Esto significa que NADIE puede activar/desactivar ventas desde
-- la app, ni siquiera un usuario logueado con la contraseña.
-- Solo vos, entrando directo al SQL Editor de Supabase con tu
-- cuenta de administrador, podés cambiarlo (ver instrucciones
-- al final de este archivo).


-- ============================================================
-- Tabla de ventas
-- ============================================================
create table if not exists ventas (
  id uuid default gen_random_uuid() primary key,
  producto_id uuid references productos(id) on delete set null,
  producto_codigo varchar(20) not null,
  producto_nombre text not null,
  cantidad int not null check (cantidad > 0),
  cliente text not null default 'Cliente ocasional',
  fecha timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists ventas_fecha_idx on ventas (fecha desc);

alter table ventas enable row level security;

create policy "Usuarios autenticados pueden leer ventas"
  on ventas for select
  to authenticated
  using (true);

create policy "Usuarios autenticados pueden insertar ventas"
  on ventas for insert
  to authenticated
  with check (true);

create policy "Usuarios autenticados pueden borrar ventas"
  on ventas for delete
  to authenticated
  using (true);

-- Nota: no hay límite de tiempo de guardado — las ventas quedan
-- para siempre salvo que las borres a mano. Es una tabla de texto/
-- números, no ocupa espacio significativo aunque pasen los años.


-- ============================================================
-- CUANDO TU CLIENTE TE CONFIRME EL PAGO, activá el módulo así:
-- (correlo en el SQL Editor de Supabase, una sola vez)
-- ============================================================
-- update app_config set ventas_habilitado = true where id = 1;

-- Y si en algún momento lo querés esconder de nuevo:
-- update app_config set ventas_habilitado = false where id = 1;
