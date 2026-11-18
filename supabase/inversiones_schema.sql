-- ============================================================
-- INVERSIONES + PATRIMONIO + INGRESOS vs META  (Bioculture)
-- Correr UNA VEZ en Supabase > SQL Editor > New query.
--
-- Es seguro correrlo: NO borra ni modifica ningún dato existente.
-- Solo agrega columnas con valor por defecto y tablas nuevas.
-- Mientras el interruptor siga apagado, la app se ve igual que antes.
--
-- Se puede volver a correr sin problema (es idempotente).
-- ============================================================


-- ------------------------------------------------------------
-- 1) Interruptor propio (apagado por defecto)
--    Igual que el de ventas: nadie puede cambiarlo desde la app,
--    solo vos desde el SQL Editor (ver el final de este archivo).
-- ------------------------------------------------------------
alter table app_config
  add column if not exists inversiones_habilitado boolean not null default false;


-- ------------------------------------------------------------
-- 2) Precio de costo por producto (todos quedan en 0 hasta que
--    el cliente los cargue desde la app)
-- ------------------------------------------------------------
alter table productos
  add column if not exists costo numeric(12,2) not null default 0;


-- ------------------------------------------------------------
-- 3) Inversiones (compras y gastos)
-- ------------------------------------------------------------
create table if not exists inversiones (
  id uuid default gen_random_uuid() primary key,
  fecha date not null default (timezone('America/Asuncion', now()))::date,
  concepto text not null,
  categoria text not null check (categoria in ('mercaderia', 'transporte', 'otros')),
  monto numeric(12,2) not null check (monto > 0),
  nota text,
  -- Solo para categoría "mercaderia": qué producto y cuántas unidades.
  -- Se guarda también código y nombre para que el historial no se
  -- pierda si algún día se elimina el producto.
  producto_id uuid references productos(id) on delete set null,
  producto_codigo varchar(20),
  producto_nombre text,
  cantidad int check (cantidad is null or cantidad > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint inversiones_mercaderia_con_cantidad
    check (categoria <> 'mercaderia' or cantidad is not null)
);

create index if not exists inversiones_fecha_idx on inversiones (fecha desc);

alter table inversiones enable row level security;

drop policy if exists "Autenticados leen inversiones" on inversiones;
drop policy if exists "Autenticados insertan inversiones" on inversiones;
drop policy if exists "Autenticados actualizan inversiones" on inversiones;
drop policy if exists "Autenticados borran inversiones" on inversiones;

create policy "Autenticados leen inversiones"
  on inversiones for select to authenticated using (true);
create policy "Autenticados insertan inversiones"
  on inversiones for insert to authenticated with check (true);
create policy "Autenticados actualizan inversiones"
  on inversiones for update to authenticated using (true) with check (true);
create policy "Autenticados borran inversiones"
  on inversiones for delete to authenticated using (true);

grant select, insert, update, delete on public.inversiones to authenticated;
grant select, insert, update, delete on public.inversiones to service_role;


-- ------------------------------------------------------------
-- 4) Metas de ingresos (una sola fila: semanal y mensual)
-- ------------------------------------------------------------
create table if not exists metas (
  id int primary key default 1,
  meta_semanal numeric(12,2) not null default 0,
  meta_mensual numeric(12,2) not null default 0,
  constraint metas_singleton check (id = 1)
);

insert into metas (id) values (1) on conflict (id) do nothing;

alter table metas enable row level security;

drop policy if exists "Autenticados leen metas" on metas;
drop policy if exists "Autenticados insertan metas" on metas;
drop policy if exists "Autenticados actualizan metas" on metas;

create policy "Autenticados leen metas"
  on metas for select to authenticated using (true);
create policy "Autenticados insertan metas"
  on metas for insert to authenticated with check (true);
create policy "Autenticados actualizan metas"
  on metas for update to authenticated using (true) with check (true);

grant select, insert, update on public.metas to authenticated;
grant select, insert, update on public.metas to service_role;


-- ------------------------------------------------------------
-- 5) Cierres de patrimonio (una "foto" del valor de la mercadería
--    por fecha, para comparar si se está avanzando o no)
-- ------------------------------------------------------------
create table if not exists patrimonio_cierres (
  id uuid default gen_random_uuid() primary key,
  fecha date not null default (timezone('America/Asuncion', now()))::date,
  patrimonio_venta numeric(14,2) not null,
  patrimonio_costo numeric(14,2) not null,
  productos_sin_costo int not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint patrimonio_cierres_fecha_unica unique (fecha)
);

alter table patrimonio_cierres enable row level security;

drop policy if exists "Autenticados leen cierres" on patrimonio_cierres;
drop policy if exists "Autenticados insertan cierres" on patrimonio_cierres;
drop policy if exists "Autenticados actualizan cierres" on patrimonio_cierres;
drop policy if exists "Autenticados borran cierres" on patrimonio_cierres;

create policy "Autenticados leen cierres"
  on patrimonio_cierres for select to authenticated using (true);
create policy "Autenticados insertan cierres"
  on patrimonio_cierres for insert to authenticated with check (true);
create policy "Autenticados actualizan cierres"
  on patrimonio_cierres for update to authenticated using (true) with check (true);
create policy "Autenticados borran cierres"
  on patrimonio_cierres for delete to authenticated using (true);

grant select, insert, update, delete on public.patrimonio_cierres to authenticated;
grant select, insert, update, delete on public.patrimonio_cierres to service_role;


-- ------------------------------------------------------------
-- 6) Funciones que ajustan el stock JUNTO con la inversión, en una
--    sola operación: o se hace todo, o no se hace nada.
--    (Corren con los permisos de quien las llama, así que siguen
--    valiendo las reglas de seguridad de las tablas.)
-- ------------------------------------------------------------

-- Auxiliar: suma o resta stock. Nunca deja el stock en negativo.
create or replace function public._ajustar_stock(p_producto_id uuid, p_delta int)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_stock int;
begin
  if p_producto_id is null or p_delta is null or p_delta = 0 then
    return;
  end if;

  select stock_actual into v_stock
  from public.productos
  where id = p_producto_id
  for update;

  -- Si el producto ya no existe (fue eliminado), no hay stock que ajustar.
  if not found then
    return;
  end if;

  if v_stock + p_delta < 0 then
    raise exception 'No se puede ajustar el stock: ya se vendió parte de esa mercadería (stock actual %, ajuste %).', v_stock, p_delta;
  end if;

  update public.productos
  set stock_actual = v_stock + p_delta
  where id = p_producto_id;
end;
$$;

-- Registrar una inversión (si es mercadería, suma el stock)
create or replace function public.registrar_inversion(
  p_fecha date,
  p_concepto text,
  p_categoria text,
  p_monto numeric,
  p_nota text,
  p_producto_id uuid,
  p_cantidad int
)
returns public.inversiones
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_codigo text;
  v_nombre text;
  v_row public.inversiones;
begin
  if p_categoria is null or p_categoria not in ('mercaderia', 'transporte', 'otros') then
    raise exception 'Categoría inválida.';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0.';
  end if;
  if btrim(coalesce(p_concepto, '')) = '' then
    raise exception 'Falta el concepto.';
  end if;

  if p_categoria = 'mercaderia' then
    if p_producto_id is null or p_cantidad is null or p_cantidad <= 0 then
      raise exception 'Para mercadería elegí el producto y una cantidad mayor a 0.';
    end if;

    select codigo, nombre into v_codigo, v_nombre
    from public.productos
    where id = p_producto_id;

    if not found then
      raise exception 'El producto elegido no existe.';
    end if;

    perform public._ajustar_stock(p_producto_id, p_cantidad);
  else
    p_producto_id := null;
    p_cantidad := null;
  end if;

  insert into public.inversiones (
    fecha, concepto, categoria, monto, nota,
    producto_id, producto_codigo, producto_nombre, cantidad
  )
  values (
    coalesce(p_fecha, (timezone('America/Asuncion', now()))::date),
    btrim(p_concepto),
    p_categoria,
    p_monto,
    nullif(btrim(coalesce(p_nota, '')), ''),
    p_producto_id, v_codigo, v_nombre, p_cantidad
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Editar una inversión (ajusta el stock según lo que cambió)
create or replace function public.editar_inversion(
  p_id uuid,
  p_fecha date,
  p_concepto text,
  p_categoria text,
  p_monto numeric,
  p_nota text,
  p_producto_id uuid,
  p_cantidad int
)
returns public.inversiones
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old public.inversiones;
  v_row public.inversiones;
  v_codigo text;
  v_nombre text;
  v_old_prod uuid;
  v_old_qty int := 0;
  v_new_prod uuid;
  v_new_qty int := 0;
begin
  select * into v_old from public.inversiones where id = p_id for update;
  if not found then
    raise exception 'Esa inversión ya no existe.';
  end if;

  if p_categoria is null or p_categoria not in ('mercaderia', 'transporte', 'otros') then
    raise exception 'Categoría inválida.';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0.';
  end if;
  if btrim(coalesce(p_concepto, '')) = '' then
    raise exception 'Falta el concepto.';
  end if;

  -- Qué stock había sumado la versión anterior
  if v_old.categoria = 'mercaderia' then
    v_old_prod := v_old.producto_id;
    v_old_qty := coalesce(v_old.cantidad, 0);
  end if;

  -- Qué stock debe sumar la versión nueva
  if p_categoria = 'mercaderia' then
    if p_producto_id is null or p_cantidad is null or p_cantidad <= 0 then
      raise exception 'Para mercadería elegí el producto y una cantidad mayor a 0.';
    end if;

    select codigo, nombre into v_codigo, v_nombre
    from public.productos
    where id = p_producto_id;

    if not found then
      raise exception 'El producto elegido no existe.';
    end if;

    v_new_prod := p_producto_id;
    v_new_qty := p_cantidad;
  else
    p_producto_id := null;
    p_cantidad := null;
  end if;

  -- Ajuste de stock: si es el mismo producto se aplica solo la
  -- diferencia; si cambió de producto, se devuelve el anterior y se
  -- suma el nuevo.
  if v_old_prod is not distinct from v_new_prod then
    perform public._ajustar_stock(v_new_prod, v_new_qty - v_old_qty);
  else
    perform public._ajustar_stock(v_old_prod, -v_old_qty);
    perform public._ajustar_stock(v_new_prod, v_new_qty);
  end if;

  update public.inversiones
  set fecha = coalesce(p_fecha, v_old.fecha),
      concepto = btrim(p_concepto),
      categoria = p_categoria,
      monto = p_monto,
      nota = nullif(btrim(coalesce(p_nota, '')), ''),
      producto_id = p_producto_id,
      producto_codigo = v_codigo,
      producto_nombre = v_nombre,
      cantidad = p_cantidad
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

-- Eliminar una inversión (si era mercadería, resta ese stock)
create or replace function public.eliminar_inversion(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old public.inversiones;
begin
  select * into v_old from public.inversiones where id = p_id for update;
  if not found then
    return;
  end if;

  if v_old.categoria = 'mercaderia' then
    perform public._ajustar_stock(v_old.producto_id, -coalesce(v_old.cantidad, 0));
  end if;

  delete from public.inversiones where id = p_id;
end;
$$;

-- Solo usuarios logueados pueden llamarlas
revoke all on function public._ajustar_stock(uuid, int) from public, anon;
revoke all on function public.registrar_inversion(date, text, text, numeric, text, uuid, int) from public, anon;
revoke all on function public.editar_inversion(uuid, date, text, text, numeric, text, uuid, int) from public, anon;
revoke all on function public.eliminar_inversion(uuid) from public, anon;

grant execute on function public._ajustar_stock(uuid, int) to authenticated, service_role;
grant execute on function public.registrar_inversion(date, text, text, numeric, text, uuid, int) to authenticated, service_role;
grant execute on function public.editar_inversion(uuid, date, text, text, numeric, text, uuid, int) to authenticated, service_role;
grant execute on function public.eliminar_inversion(uuid) to authenticated, service_role;


-- ------------------------------------------------------------
-- 7) Categorías de producto (Termos, Inciensos, Fármacos, ...)
--    Las crea, renombra y borra el cliente desde la app.
--    Al borrar una categoría, sus productos quedan "sin categoría"
--    (los productos NO se borran).
-- ------------------------------------------------------------
create table if not exists categorias_producto (
  id uuid default gen_random_uuid() primary key,
  nombre text not null check (btrim(nombre) <> ''),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- No permite dos categorías con el mismo nombre (sin importar mayúsculas)
create unique index if not exists categorias_producto_nombre_unico
  on categorias_producto (lower(btrim(nombre)));

alter table categorias_producto enable row level security;

drop policy if exists "Autenticados leen categorias" on categorias_producto;
drop policy if exists "Autenticados insertan categorias" on categorias_producto;
drop policy if exists "Autenticados actualizan categorias" on categorias_producto;
drop policy if exists "Autenticados borran categorias" on categorias_producto;

create policy "Autenticados leen categorias"
  on categorias_producto for select to authenticated using (true);
create policy "Autenticados insertan categorias"
  on categorias_producto for insert to authenticated with check (true);
create policy "Autenticados actualizan categorias"
  on categorias_producto for update to authenticated using (true) with check (true);
create policy "Autenticados borran categorias"
  on categorias_producto for delete to authenticated using (true);

grant select, insert, update, delete on public.categorias_producto to authenticated;
grant select, insert, update, delete on public.categorias_producto to service_role;

-- Categoría de cada producto (vacía hasta que el cliente la asigne)
alter table productos
  add column if not exists categoria_id uuid references categorias_producto(id) on delete set null;


-- ============================================================
-- INTERRUPTOR — cuando tu cliente confirme y pague, activalo así
-- (copiá UNA sola línea, pegala en un New query y dale Run):
-- ============================================================
-- update app_config set inversiones_habilitado = true where id = 1;

-- Para esconderlo de nuevo:
-- update app_config set inversiones_habilitado = false where id = 1;
