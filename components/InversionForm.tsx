"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Trash2, Search, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Producto,
  Inversion,
  CategoriaInversion,
  CATEGORIAS_INVERSION,
} from "@/lib/types";
import { hoyISO } from "@/lib/fechas";
import ProductDrawer from "@/components/ProductDrawer";
import { useUI } from "@/components/UI";

function mensajeError(e: { message?: string; code?: string }): string {
  if (e.code === "PGRST202" || e.message?.includes("Could not find the function")) {
    return "Falta ejecutar el SQL de inversiones en Supabase.";
  }
  return e.message || "No se pudo guardar. Probá de nuevo.";
}

export default function InversionForm({
  open,
  inversion,
  productos,
  onClose,
  onGuardado,
  onProductoCreado,
}: {
  open: boolean;
  inversion: Inversion | null;
  productos: Producto[];
  onClose: () => void;
  onGuardado: () => void | Promise<void>;
  onProductoCreado: (p: Producto) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { confirmar } = useUI();
  const esEdicion = !!inversion;

  const [fecha, setFecha] = useState(hoyISO());
  const [categoria, setCategoria] = useState<CategoriaInversion>("mercaderia");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [productoSel, setProductoSel] = useState<Producto | null>(null);
  const [query, setQuery] = useState("");
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFecha(inversion?.fecha ?? hoyISO());
    setCategoria(inversion?.categoria ?? "mercaderia");
    setConcepto(inversion?.concepto ?? "");
    setMonto(inversion ? String(inversion.monto) : "");
    setNota(inversion?.nota ?? "");
    setCantidad(inversion?.cantidad ? String(inversion.cantidad) : "1");
    setProductoSel(
      inversion?.producto_id ? productos.find((p) => p.id === inversion.producto_id) ?? null : null
    );
    setQuery("");
    setError(null);
  }, [open, inversion]); // eslint-disable-line react-hooks/exhaustive-deps

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lista = q
      ? productos.filter(
          (p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
        )
      : productos;
    return lista.slice(0, 8);
  }, [productos, query]);

  if (!open) return null;

  const esMercaderia = categoria === "mercaderia";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = Number(monto);
    const cantidadNum = Math.floor(Number(cantidad));

    if (!montoNum || montoNum <= 0) {
      setError("Poné un monto mayor a 0.");
      return;
    }
    if (esMercaderia) {
      if (!productoSel) {
        setError("Elegí el producto, o creá uno nuevo.");
        return;
      }
      if (!cantidadNum || cantidadNum <= 0) {
        setError("La cantidad tiene que ser mayor a 0.");
        return;
      }
    }

    const conceptoFinal =
      concepto.trim() || (esMercaderia && productoSel ? `Compra de ${productoSel.nombre}` : "");
    if (!conceptoFinal) {
      setError("Escribí en qué fue la inversión.");
      return;
    }

    const params = {
      p_fecha: fecha || hoyISO(),
      p_concepto: conceptoFinal,
      p_categoria: categoria,
      p_monto: montoNum,
      p_nota: nota.trim() || null,
      p_producto_id: esMercaderia ? productoSel!.id : null,
      p_cantidad: esMercaderia ? cantidadNum : null,
    };

    setLoading(true);
    const { error: err } = esEdicion
      ? await supabase.rpc("editar_inversion", { p_id: inversion!.id, ...params })
      : await supabase.rpc("registrar_inversion", params);
    setLoading(false);

    if (err) {
      setError(mensajeError(err));
      return;
    }
    await onGuardado();
  }

  async function handleDelete() {
    if (!inversion) return;
    const aviso =
      inversion.categoria === "mercaderia" && inversion.cantidad
        ? `Se van a RESTAR ${inversion.cantidad} unidades del stock de "${inversion.producto_nombre}".`
        : undefined;
    const ok = await confirmar({
      titulo: `¿Eliminar "${inversion.concepto}"?`,
      mensaje: aviso,
      confirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    setDeleting(true);
    const { error: err } = await supabase.rpc("eliminar_inversion", { p_id: inversion.id });
    setDeleting(false);

    if (err) {
      setError(mensajeError(err));
      return;
    }
    await onGuardado();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

        <div className="safe-bottom relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-lg border-t border-zinc-800 bg-zinc-950 shadow-subtle">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3.5">
            <h2 className="text-[14px] font-medium text-zinc-100">
              {esEdicion ? "Editar inversión" : "Nueva inversión"}
            </h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
              {/* Categoría */}
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIAS_INVERSION.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setCategoria(c.value)}
                    className={`h-9 rounded text-[12.5px] font-medium transition-colors ${
                      categoria === c.value
                        ? "bg-zinc-100 text-zinc-950"
                        : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Producto (solo mercadería) */}
              {esMercaderia && (
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                    Producto
                  </label>

                  {productoSel ? (
                    <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-zinc-100">
                          <span className="mr-1.5 font-mono text-[11.5px] text-zinc-500">
                            {productoSel.codigo}
                          </span>
                          {productoSel.nombre}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-zinc-500">
                          Stock actual: {productoSel.stock_actual}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProductoSel(null)}
                        className="shrink-0 text-[12px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Buscar por código o nombre..."
                          className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                        />
                      </div>
                      <div className="mt-1.5 max-h-44 divide-y divide-zinc-900 overflow-y-auto rounded border border-zinc-800">
                        {resultados.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => setProductoSel(p)}
                            className="flex w-full items-center gap-2.5 bg-zinc-900/50 px-3 py-2 text-left transition-colors hover:bg-zinc-900"
                          >
                            <span className="font-mono text-[11.5px] text-zinc-500">{p.codigo}</span>
                            <span className="flex-1 truncate text-[13px] text-zinc-100">{p.nombre}</span>
                            <span className="tabular text-[11.5px] text-zinc-500">{p.stock_actual} u.</span>
                          </button>
                        ))}
                        {resultados.length === 0 && (
                          <p className="px-3 py-2.5 text-[12px] text-zinc-500">Sin resultados</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setNuevoOpen(true)}
                        className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded border border-dashed border-zinc-700 text-[12.5px] font-medium text-zinc-300 transition-colors hover:border-zinc-500"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Añadir producto nuevo
                      </button>
                      <p className="mt-1.5 text-[11px] text-zinc-600">
                        Si es nuevo, dejalo con stock 0: la compra suma las unidades sola.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cantidad + monto */}
              <div className={`grid gap-2.5 ${esMercaderia ? "grid-cols-2" : "grid-cols-1"}`}>
                {esMercaderia && (
                  <div>
                    <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                      Cantidad comprada
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      className="tabular h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13.5px] text-zinc-100 outline-none focus:border-zinc-600"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                    {esMercaderia ? "Monto total pagado (₲)" : "Monto (₲)"}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="150000"
                    className="tabular h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Concepto + fecha */}
              <div>
                <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                  {esMercaderia ? "Concepto (opcional)" : "Concepto"}
                </label>
                <input
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder={esMercaderia ? "Se completa solo con el producto" : "Ej: Flete, nafta, bolsas"}
                  className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13.5px] text-zinc-100 outline-none [color-scheme:dark] focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-medium text-zinc-400">
                    Nota (opcional)
                  </label>
                  <input
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13.5px] text-zinc-100 outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger-text">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2 border-t border-zinc-800 px-4 py-3.5">
              {esEdicion && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || loading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-danger-border text-danger-text transition-colors hover:bg-danger-bg disabled:opacity-50"
                  aria-label="Eliminar inversión"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={loading || deleting}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded bg-zinc-100 text-[13.5px] font-medium text-zinc-950 transition-colors hover:bg-white disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {esEdicion ? "Guardar cambios" : "Guardar inversión"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Crear producto sin salir de esta pantalla */}
      <ProductDrawer
        open={nuevoOpen}
        producto={null}
        mostrarCosto
        zClass="z-50"
        onClose={() => setNuevoOpen(false)}
        onGuardado={(p) => {
          onProductoCreado(p);
          setProductoSel(p);
          setNuevoOpen(false);
        }}
      />
    </>
  );
}
