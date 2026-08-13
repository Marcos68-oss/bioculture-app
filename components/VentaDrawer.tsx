"use client";

import { useMemo, useState } from "react";
import { X, Loader2, Search, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Producto, ItemCarrito, formatGs } from "@/lib/types";

export default function VentaDrawer({
  open,
  productos,
  onClose,
  onConfirmar,
}: {
  open: boolean;
  productos: Producto[];
  onClose: () => void;
  onConfirmar: (items: ItemCarrito[], cliente: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [ocasional, setOcasional] = useState(true);
  const [cliente, setCliente] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultados = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return productos
      .filter(
        (p) =>
          (p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)) &&
          !carrito.some((it) => it.producto.id === p.id)
      )
      .slice(0, 6);
  }, [productos, query, carrito]);

  const total = useMemo(
    () => carrito.reduce((s, it) => s + it.producto.precio * it.cantidad, 0),
    [carrito]
  );

  if (!open) return null;

  function reset() {
    setQuery("");
    setCarrito([]);
    setOcasional(true);
    setCliente("");
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function agregarProducto(p: Producto) {
    setCarrito((prev) => [...prev, { producto: p, cantidad: 1 }]);
    setQuery("");
  }

  function quitarProducto(productoId: string) {
    setCarrito((prev) => prev.filter((it) => it.producto.id !== productoId));
  }

  function cambiarCantidad(productoId: string, delta: number) {
    setCarrito((prev) =>
      prev.map((it) => {
        if (it.producto.id !== productoId) return it;
        const max = it.producto.stock_actual;
        const nueva = Math.min(max, Math.max(1, it.cantidad + delta));
        return { ...it, cantidad: nueva };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (carrito.length === 0) {
      setError("Agregá al menos un producto.");
      return;
    }
    for (const it of carrito) {
      if (it.cantidad > it.producto.stock_actual) {
        setError(`"${it.producto.nombre}" tiene solo ${it.producto.stock_actual} en stock.`);
        return;
      }
    }

    const nombreCliente = ocasional ? "Cliente ocasional" : cliente.trim();
    if (!ocasional && !nombreCliente) {
      setError("Escribí el nombre del cliente, o marcá \"Cliente ocasional\".");
      return;
    }

    setLoading(true);
    const ok = await onConfirmar(carrito, nombreCliente);
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

      <div className="safe-bottom relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-lg border-t border-zinc-800 bg-zinc-950 shadow-subtle">
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
            {/* Buscador para agregar productos */}
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                Agregar producto
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por código o nombre..."
                  className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                />
              </div>

              {resultados.length > 0 && (
                <div className="mt-1.5 divide-y divide-zinc-900 overflow-hidden rounded border border-zinc-800">
                  {resultados.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => agregarProducto(p)}
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

            {/* Carrito */}
            {carrito.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                  Productos en esta venta ({carrito.length})
                </label>
                <div className="divide-y divide-zinc-900 overflow-hidden rounded border border-zinc-800">
                  {carrito.map((it) => (
                    <div key={it.producto.id} className="flex items-center gap-2 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-zinc-100">
                          {it.producto.nombre}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {formatGs(it.producto.precio)} c/u · Stock: {it.producto.stock_actual}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(it.producto.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 text-zinc-300 active:scale-90"
                      >
                        <Minus className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                      <span className="tabular w-5 text-center text-[13px] font-semibold text-zinc-100">
                        {it.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(it.producto.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 text-zinc-300 active:scale-90"
                      >
                        <Plus className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                      <span className="tabular w-16 shrink-0 text-right text-[12.5px] text-zinc-300">
                        {formatGs(it.producto.precio * it.cantidad)}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarProducto(it.producto.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-600 hover:text-danger-text"
                        aria-label="Quitar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-[12px] text-zinc-500">Total</span>
                  <span className="text-[16px] font-semibold text-zinc-100">{formatGs(total)}</span>
                </div>
              </div>
            )}

            {/* Cliente */}
            {carrito.length > 0 && (
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
          </div>

          <div className="border-t border-zinc-800 px-4 py-3.5">
            <button
              type="submit"
              disabled={carrito.length === 0 || loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded bg-zinc-100 text-[13.5px] font-medium text-zinc-950 transition-colors hover:bg-white disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {carrito.length > 0 ? `Confirmar venta — ${formatGs(total)}` : "Confirmar venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
