export type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  created_at: string;
};

export type EstadoStock = "ok" | "poco" | "agotado";

export function getEstadoStock(p: Pick<Producto, "stock_actual" | "stock_minimo">): EstadoStock {
  if (p.stock_actual <= 0) return "agotado";
  if (p.stock_actual <= p.stock_minimo) return "poco";
  return "ok";
}

export type Venta = {
  id: string;
  producto_id: string | null;
  producto_codigo: string;
  producto_nombre: string;
  cantidad: number;
  cliente: string;
  fecha: string;
};
