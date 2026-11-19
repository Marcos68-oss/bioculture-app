"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Check, X, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CategoriaProducto, Producto } from "@/lib/types";

const SUGERIDAS = ["Termos", "Inciensos", "Fármacos", "Hule"];

function mensaje(e: { code?: string; message?: string }): string {
  if (e.code === "23505") return "Ya existe una categoría con ese nombre.";
  if (e.code === "42P01" || e.message?.includes("does not exist")) {
    return "Falta ejecutar el SQL de inversiones en Supabase.";
  }
  return "No se pudo guardar. Probá de nuevo.";
}

export default function CategoriasTab({
  categorias,
  productos,
  onCategoriasCambiaron,
  onProductosCambiaron,
}: {
  categorias: CategoriaProducto[];
  productos: Producto[];
  onCategoriasCambiaron: () => void | Promise<void>;
  onProductosCambiaron: () => void | Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [nuevo, setNuevo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conteo = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of productos) {
      if (p.categoria_id) m.set(p.categoria_id, (m.get(p.categoria_id) ?? 0) + 1);
    }
    return m;
  }, [productos]);

  const sinCategoria = productos.filter((p) => !p.categoria_id).length;
  const sugeridasFaltantes = SUGERIDAS.filter(
    (s) => !categorias.some((c) => c.nombre.trim().toLowerCase() === s.toLowerCase())
  );

  async function agregar(nombre: string) {
    const limpio = nombre.trim();
    if (!limpio) return;
    setError(null);
    setOcupado("nuevo");
    const { error: err } = await supabase.from("categorias_producto").insert({ nombre: limpio });
    setOcupado(null);
    if (err) {
      setError(mensaje(err));
      return;
    }
    setNuevo("");
    await onCategoriasCambiaron();
  }

  async function guardarEdicion(c: CategoriaProducto) {
    const limpio = editNombre.trim();
    if (!limpio || limpio === c.nombre) {
      setEditandoId(null);
      return;
    }
    setError(null);
    setOcupado(c.id);
    const { error: err } = await supabase
      .from("categorias_producto")
      .update({ nombre: limpio })
      .eq("id", c.id);
    setOcupado(null);
    if (err) {
      setError(mensaje(err));
      return;
    }
    setEditandoId(null);
    await onCategoriasCambiaron();
  }

  async function borrar(c: CategoriaProducto) {
    const n = conteo.get(c.id) ?? 0;
    const aviso =
      n > 0
        ? `\n\n${n} producto(s) van a quedar "Sin categoría". Los productos NO se borran.`
        : "";
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?${aviso}`)) return;

    setError(null);
    setOcupado(c.id);
    const { error: err } = await supabase.from("categorias_producto").delete().eq("id", c.id);
    setOcupado(null);
    if (err) {
      setError(mensaje(err));
      return;
    }
    await Promise.all([onCategoriasCambiaron(), onProductosCambiaron()]);
  }

  return (
    <div className="px-4 py-4">
      <p className="text-[12px] leading-relaxed text-zinc-500">
        Creá las categorías de tus productos (por ejemplo Termos o Inciensos). Después asignalas en
        la pestaña Costos, y en Resumen vas a ver el patrimonio por categoría.
      </p>

      {/* Agregar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          agregar(nuevo);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nueva categoría..."
          className="h-9 min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
        />
        <button
          type="submit"
          disabled={!nuevo.trim() || ocupado === "nuevo"}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded bg-zinc-100 px-3 text-[13px] font-medium text-zinc-950 disabled:opacity-50"
        >
          {ocupado === "nuevo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar
        </button>
      </form>

      {sugeridasFaltantes.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-600">Sugeridas:</span>
          {sugeridasFaltantes.map((s) => (
            <button
              key={s}
              onClick={() => agregar(s)}
              disabled={ocupado === "nuevo"}
              className="rounded border border-zinc-800 px-2 py-1 text-[11.5px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2.5 rounded border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger-text">
          {error}
        </p>
      )}

      {/* Lista */}
      <div className="mt-4 divide-y divide-zinc-900 rounded border border-zinc-800">
        {categorias.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-zinc-500">Todavía no creaste categorías</p>
        ) : (
          categorias.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2.5">
              {editandoId === c.id ? (
                <>
                  <input
                    autoFocus
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") guardarEdicion(c);
                      if (e.key === "Escape") setEditandoId(null);
                    }}
                    className="h-9 min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2.5 text-[13.5px] text-zinc-100 outline-none"
                  />
                  <button
                    onClick={() => guardarEdicion(c)}
                    disabled={ocupado === c.id}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-ok-border text-ok-text"
                    aria-label="Guardar nombre"
                  >
                    {ocupado === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-800 text-zinc-500"
                    aria-label="Cancelar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-zinc-100">{c.nombre}</p>
                    <p className="text-[11px] text-zinc-500">{conteo.get(c.id) ?? 0} producto(s)</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditandoId(c.id);
                      setEditNombre(c.nombre);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:text-zinc-200"
                    aria-label="Renombrar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => borrar(c)}
                    disabled={ocupado === c.id}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-600 hover:text-danger-text disabled:opacity-50"
                    aria-label="Eliminar"
                  >
                    {ocupado === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {categorias.length > 0 && sinCategoria > 0 && (
        <p className="mt-2.5 text-[11.5px] text-zinc-500">
          {sinCategoria} producto(s) todavía sin categoría. Asignalas en la pestaña Costos.
        </p>
      )}
    </div>
  );
}
