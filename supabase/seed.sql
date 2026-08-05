-- ============================================================
-- Datos de prueba: 5 remedios naturales / yuyos iniciales
-- ============================================================

insert into productos (codigo, nombre, stock_actual, stock_minimo) values
  ('001', 'Manzanilla',        24, 8),
  ('002', 'Cedrón',             5, 6),
  ('003', 'Cola de Caballo',    0, 5),
  ('004', 'Boldo',             18, 5),
  ('005', 'Menta Piperita',    12, 5)
on conflict (codigo) do nothing;
