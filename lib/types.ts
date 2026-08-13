export type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  precio: number;
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
