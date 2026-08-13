"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Producto } from "@/lib/types";

export default function ProductDrawer({
  open,
  producto,
  onClose,
  onGuardado,
}: {
  open: boolean;
  producto: Producto | null;
  onClose: () => void;
  onGuardado: (producto: Producto) => void;
}) {
  const supabase = createClient();
  const esEdicion = !!producto;

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [stockActual, setStockActual] = useState("0");
  const [stockMinimo, setStockMinimo] = useState("5");
  const [precio, setPrecio] = useState("0");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCodigo(producto?.codigo ?? "");
      setNombre(producto?.nombre ?? "");
      setStockActual(String(producto?.stock_actual ?? 0));
      setStockMinimo(String(producto?.stock_minimo ?? 5));
      setPrecio(String(producto?.precio ?? 0));
      setError(null);
    }
  }, [open, producto]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      stock_actual: Number(stockActual) || 0,
      stock_minimo: Number(stockMinimo) || 0,
      precio: Number(precio) || 0,
    };

    if (!payload.codigo || !payload.nombre) {
      setError("Código y nombre son obligatorios.");
      setLoading(false);
      return;
    }

    if (esEdicion && producto) {
      const { data, error } = await supabase
        .from("productos")
        .update(payload)
        .eq("id", producto.id)
        .select()
        .single();

      setLoading(false);
      if (error) {
        setError(error.code === "23505" ? "Ese código ya existe." : "No se pudo guardar.");
        return;
      }
      onGuardado(data as Producto);
    } else {
      const { data, error } = await supabase
        .from("productos")
        .insert(payload)
        .select()
        .single();

      setLoading(false);
      if (error) {
        setError(error.code === "23505" ? "Ese código ya existe." : "No se pudo crear.");
        return;
      }
      onGuardado(data as Producto);
    }
  }

  async function handleDelete() {
    if (!producto) return;
    if (!confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;

    setDeleting(true);
    const { error } = await supabase.from("productos").delete().eq("id", producto.id);
    setDeleting(false);

    if (error) {
      setError("No se pudo eliminar.");
      return;
    }
    onGuardado({ ...producto, id: producto.id, __deleted: true } as unknown as Producto);
    onClose();
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="safe-bottom relative z-10 w-full max-w-md rounded-t-lg border-t border-zinc-800 bg-zinc-950 shadow-subtle">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3.5">
          <h2 className="text-[14px] font-medium text-zinc-100">
            {esEdicion ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 px-4 py-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-1">
              <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                Código
              </label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="065"
                className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 font-mono text-[13.5px] text-zinc-100 outline-none focus:border-zinc-600"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                Nombre
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Manzanilla"
                className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13.5px] text-zinc-100 outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                Stock actual
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                className="tabular h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13.5px] text-zinc-100 outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                Stock mínimo
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="tabular h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13.5px] text-zinc-100 outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
              Precio (₲)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-zinc-500">
                ₲
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="15000"
                className="tabular h-9 w-full rounded border border-zinc-800 bg-zinc-900 pl-7 pr-2.5 text-[13.5px] text-zinc-100 outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {error && (
            <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger-text">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            {esEdicion && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-danger-border text-danger-text transition-colors hover:bg-danger-bg disabled:opacity-50"
                aria-label="Eliminar producto"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded bg-zinc-100 text-[13.5px] font-medium text-zinc-950 transition-colors hover:bg-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
