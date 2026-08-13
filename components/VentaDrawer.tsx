"use client";

import { useMemo, useState } from "react";
import { X, Loader2, Search, Minus, Plus, ShoppingCart } from "lucide-react";
import { Producto } from "@/lib/types";

export default function VentaDrawer({
  open,
  productos,
  onClose,
  onConfirmar,
}: {
  open: boolean;
  productos: Producto[];
  onClose: () => void;
  onConfirmar: (producto: Producto, cantidad: number, cliente: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [productoSel, setProductoSel] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [ocasional, setOcasional] = useState(true);
  const [cliente, setCliente] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultados = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return productos
      .filter((p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))
      .slice(0, 6);
  }, [productos, query]);

  if (!open) return null;

  function reset() {
    setQuery("");
    setProductoSel(null);
    setCantidad(1);
    setOcasional(true);
    setCliente("");
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!productoSel) {
      setError("Elegí un producto.");
      return;
    }
    if (cantidad <= 0) {
      setError("La cantidad tiene que ser mayor a 0.");
      return;
    }
    if (cantidad > productoSel.stock_actual) {
      setError(`Solo hay ${productoSel.stock_actual} en stock.`);
      return;
    }

    const nombreCliente = ocasional ? "Cliente ocasional" : cliente.trim();
    if (!ocasional && !nombreCliente) {
      setError("Escribí el nombre del cliente, o marcá \"Cliente ocasional\".");
      return;
    }

    setLoading(true);
    const ok = await onConfirmar(productoSel, cantidad, nombreCliente);
    setLoading(false);

    if (ok) {
      reset();
      onClose();
    } else {
      setError("No se pudo registrar la venta. Probá de nuevo.");
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={handleClose} aria-hidden />

      <div className="safe-bottom relative z-10 w-full max-w-md rounded-t-lg border-t border-zinc-800 bg-zinc-950 shadow-subtle">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3.5">
          <h2 className="flex items-center gap-2 text-[14px] font-medium text-zinc-100">
            <ShoppingCart className="h-4 w-4 text-ok-text" />
            Registrar venta
          </h2>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 px-4 py-4">
          {/* Selector de producto */}
          {!productoSel ? (
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                Producto
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por código o nombre..."
                  autoFocus
                  className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                />
              </div>

              {resultados.length > 0 && (
                <div className="mt-1.5 divide-y divide-zinc-900 overflow-hidden rounded border border-zinc-800">
                  {resultados.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setProductoSel(p)}
                      disabled={p.stock_actual <= 0}
                      className="flex w-full items-center gap-2.5 bg-zinc-900/50 px-3 py-2 text-left transition-colors hover:bg-zinc-900 disabled:opacity-40"
                    >
                      <span className="font-mono text-[11.5px] text-zinc-500">{p.codigo}</span>
                      <span className="flex-1 truncate text-[13px] text-zinc-100">{p.nombre}</span>
                      <span className="tabular text-[11.5px] text-zinc-500">
                        {p.stock_actual <= 0 ? "Agotado" : `${p.stock_actual} u.`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-zinc-100">
                  <span className="mr-1.5 font-mono text-[11.5px] text-zinc-500">
                    {productoSel.codigo}
                  </span>
                  {productoSel.nombre}
                </p>
                <p className="mt-0.5 text-[11.5px] text-zinc-500">
                  Stock disponible: {productoSel.stock_actual}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProductoSel(null);
                  setCantidad(1);
                }}
                className="shrink-0 text-[12px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
              >
                Cambiar
              </button>
            </div>
          )}

          {/* Cantidad */}
          {productoSel && (
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                Cantidad
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded border border-zinc-800 text-zinc-300 active:scale-90"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={productoSel.stock_actual}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                  className="tabular h-9 w-16 rounded border border-zinc-800 bg-zinc-900 text-center text-[14px] font-semibold text-zinc-100 outline-none focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={() =>
                    setCantidad((c) => Math.min(productoSel.stock_actual, c + 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded border border-zinc-800 text-zinc-300 active:scale-90"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          {/* Cliente */}
          {productoSel && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11.5px] font-medium text-zinc-400">Cliente</label>
                <button
                  type="button"
                  onClick={() => setOcasional((v) => !v)}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11.5px] font-medium transition-colors ${
                    ocasional
                      ? "bg-zinc-100 text-zinc-950"
                      : "border border-zinc-800 text-zinc-400"
                  }`}
                >
                  Cliente ocasional
                </button>
              </div>
              {!ocasional && (
                <input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-3 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                />
              )}
            </div>
          )}

          {error && (
            <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger-text">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!productoSel || loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded bg-zinc-100 text-[13.5px] font-medium text-zinc-950 transition-colors hover:bg-white disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar venta
          </button>
        </form>
      </div>
    </div>
  );
}
