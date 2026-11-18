"use client";

import { useMemo, useState } from "react";
import { Search, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Producto, CategoriaProducto, formatGs } from "@/lib/types";

type Filtro = "todos" | "sinCosto" | "sinCategoria";

export default function CostosTab({
  productos,
  categorias,
  onProductoActualizado,
}: {
  productos: Producto[];
  categorias: CategoriaProducto[];
  onProductoActualizado: (p: Producto) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [guardadoId, setGuardadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sinCosto = productos.filter((p) => !(p.costo && p.costo > 0)).length;
  const sinCategoria = productos.filter((p) => !p.categoria_id).length;

  const lista = useMemo(() => {
    let l = productos;
    if (filtro === "sinCosto") l = l.filter((p) => !(p.costo && p.costo > 0));
    if (filtro === "sinCategoria") l = l.filter((p) => !p.categoria_id);
    const q = query.trim().toLowerCase();
    if (q) l = l.filter((p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q));
    return l;
  }, [productos, query, filtro]);

  function marcarGuardado(id: string) {
    setGuardadoId(id);
    window.setTimeout(() => setGuardadoId((x) => (x === id ? null : x)), 1200);
  }

  async function guardarCosto(p: Producto) {
    const texto = valores[p.id];
    if (texto === undefined) return; // no tocó el campo
    const nuevo = Math.max(0, Number(texto) || 0);
    if (nuevo === (p.costo ?? 0)) return;

    setError(null);
    setGuardando(p.id);
    const { data, error: err } = await supabase
      .from("productos")
      .update({ costo: nuevo })
      .eq("id", p.id)
      .select()
      .single();
    setGuardando(null);

    if (err || !data) {
      setError("No se pudo guardar el costo. ¿Ya corriste el SQL en Supabase?");
      return;
    }
    onProductoActualizado(data as Producto);
    setValores((v) => {
      const { [p.id]: _omit, ...resto } = v;
      return resto;
    });
    marcarGuardado(p.id);
  }

  async function guardarCategoria(p: Producto, categoriaId: string) {
    setError(null);
    setGuardando(p.id);
    const { data, error: err } = await supabase
      .from("productos")
      .update({ categoria_id: categoriaId || null })
      .eq("id", p.id)
      .select()
      .single();
    setGuardando(null);

    if (err || !data) {
      setError("No se pudo guardar la categoría. ¿Ya corriste el SQL en Supabase?");
      return;
    }
    onProductoActualizado(data as Producto);
    marcarGuardado(p.id);
  }

  const chip = (activo: boolean) =>
    `h-7 rounded px-2.5 text-[12px] font-medium transition-colors ${
      activo ? "bg-zinc-100 text-zinc-950" : "border border-zinc-800 text-zinc-400"
    }`;

  return (
    <div className="px-4 py-4">
      <p className="text-[12px] leading-relaxed text-zinc-500">
        Cargá el costo de compra de cada unidad y su categoría. Todo se guarda solo.
      </p>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="h-9 w-full rounded border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button onClick={() => setFiltro("todos")} className={chip(filtro === "todos")}>
          Todos ({productos.length})
        </button>
        <button onClick={() => setFiltro("sinCosto")} className={chip(filtro === "sinCosto")}>
          Sin costo ({sinCosto})
        </button>
        <button onClick={() => setFiltro("sinCategoria")} className={chip(filtro === "sinCategoria")}>
          Sin categoría ({sinCategoria})
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger-text">
          {error}
        </p>
      )}

      <div className="mt-3 divide-y divide-zinc-900 rounded border border-zinc-800">
        {lista.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-zinc-500">
            {filtro === "sinCosto"
              ? "Todos los productos tienen costo"
              : filtro === "sinCategoria"
              ? "Todos los productos tienen categoría"
              : "Sin resultados"}
          </p>
        ) : (
          lista.map((p) => (
            <div key={p.id} className="px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 shrink-0 font-mono text-[11.5px] text-zinc-500">{p.codigo}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-zinc-100">{p.nombre}</p>
                  <p className="text-[11px] text-zinc-600">
                    Venta {formatGs(p.precio)} · Stock {p.stock_actual}
                  </p>
                </div>
                <div className="relative w-28 shrink-0">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Costo"
                    value={valores[p.id] ?? (p.costo ? String(p.costo) : "")}
                    onChange={(e) => setValores((v) => ({ ...v, [p.id]: e.target.value }))}
                    onBlur={() => guardarCosto(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="tabular h-9 w-full rounded border border-zinc-800 bg-zinc-900 pl-2.5 pr-7 text-right text-[13px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                    {guardando === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                    ) : guardadoId === p.id ? (
                      <Check className="h-3.5 w-3.5 text-ok-text" />
                    ) : null}
                  </span>
                </div>
              </div>

              {categorias.length > 0 && (
                <select
                  value={p.categoria_id ?? ""}
                  onChange={(e) => guardarCategoria(p, e.target.value)}
                  className="mt-2 h-8 w-full rounded border border-zinc-800 bg-zinc-900 px-2 text-[12.5px] text-zinc-300 outline-none [color-scheme:dark] focus:border-zinc-600"
                  aria-label={`Categoría de ${p.nombre}`}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))
        )}
      </div>

      {categorias.length === 0 && (
        <p className="mt-2.5 text-[11.5px] text-zinc-500">
          Para asignar categorías, primero creálas en la pestaña Categorías.
        </p>
      )}
    </div>
  );
}
