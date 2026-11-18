export type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  precio: number;
  costo?: number; // precio de costo unitario (solo existe si se corrió inversiones_schema.sql)
  categoria_id?: string | null; // categoría del producto (idem)
  created_at: string;
};

export type EstadoStock = "ok" | "poco" | "agotado";

export function getEstadoStock(p: Pick<Producto, "stock_actual" | "stock_minimo">): EstadoStock {
  if (p.stock_actual <= 0) return "agotado";
  if (p.stock_actual <= p.stock_minimo) return "poco";
  return "ok";
}

export function formatGs(valor: number): string {
  return "₲ " + Math.round(valor).toLocaleString("es-PY");
}

// Un item dentro del carrito, antes de confirmar la venta
export type ItemCarrito = {
  producto: Producto;
  cantidad: number;
};

// Un item ya guardado, tal cual queda en la base (venta_items)
export type VentaItem = {
  id: string;
  venta_id: string;
  producto_id: string | null;
  producto_codigo: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

// La cabecera de una venta, con sus items (venta_items) anidados
export type Venta = {
  id: string;
  cliente: string;
  total: number;
  fecha: string;
  venta_items: VentaItem[];
};

// ---------- Inversiones, metas y patrimonio ----------

export type CategoriaInversion = "mercaderia" | "transporte" | "otros";

export const CATEGORIAS_INVERSION: { value: CategoriaInversion; label: string }[] = [
  { value: "mercaderia", label: "Mercadería" },
  { value: "transporte", label: "Transporte" },
  { value: "otros", label: "Otros" },
];

export function labelCategoria(c: string): string {
  return CATEGORIAS_INVERSION.find((x) => x.value === c)?.label ?? c;
}

export type Inversion = {
  id: string;
  fecha: string; // YYYY-MM-DD
  concepto: string;
  categoria: CategoriaInversion;
  monto: number;
  nota: string | null;
  producto_id: string | null;
  producto_codigo: string | null;
  producto_nombre: string | null;
  cantidad: number | null;
  created_at: string;
};

export type Metas = {
  meta_semanal: number;
  meta_mensual: number;
};

export type CierrePatrimonio = {
  id: string;
  fecha: string; // YYYY-MM-DD
  patrimonio_venta: number;
  patrimonio_costo: number;
  productos_sin_costo: number;
};

export type CategoriaProducto = {
  id: string;
  nombre: string;
};
