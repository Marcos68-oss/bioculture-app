"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Check, X, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Producto, Metas, CierrePatrimonio, CategoriaProducto, formatGs } from "@/lib/types";
import {
  aISO,
  hoyISO,
  inicioSemana,
  finSemana,
  inicioMes,
  finMes,
  inicioDelDia,
  finDelDia,
  sumarDias,
  fmtCorta,
  fmtISOLarga,
  MESES,
} from "@/lib/fechas";

type Modo = "semana" | "mes";

function delta(n: number): string {
  if (n === 0) return "sin cambios";
  return `${n > 0 ? "▲ +" : "▼ −"}${formatGs(Math.abs(n))}`;
}

export default function ResumenTab({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: CategoriaProducto[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [modo, setModo] = useState<Modo>("semana");
  const [ancla, setAncla] = useState<Date>(() => new Date());
  const [vendido, setVendido] = useState(0);
  const [invertido, setInvertido] = useState(0);
  const [cargando, setCargando] = useState(true);

  const [metas, setMetas] = useState<Metas | null>(null);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState("");
  const [guardandoMeta, setGuardandoMeta] = useState(false);

  const [cierres, setCierres] = useState<CierrePatrimonio[]>([]);
  const [guardandoCierre, setGuardandoCierre] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const rango = useMemo(
    () =>
      modo === "semana"
        ? { desde: inicioSemana(ancla), hasta: finSemana(ancla) }
        : { desde: inicioMes(ancla), hasta: finMes(ancla) },
    [modo, ancla]
  );
  const esActual = rango.hasta >= inicioDelDia(new Date());

  const etiquetaRango =
    modo === "semana"
      ? `Semana ${fmtCorta(rango.desde)} – ${fmtCorta(rango.hasta)}`
      : `${MESES[rango.desde.getMonth()]} ${rango.desde.getFullYear()}`;

  function mover(dir: -1 | 1) {
    setAncla((a) =>
      modo === "semana" ? sumarDias(a, 7 * dir) : new Date(a.getFullYear(), a.getMonth() + dir, 1)
    );
  }

  // Ventas e inversiones del período
  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true);
      const [v, i] = await Promise.all([
        supabase
          .from("ventas")
          .select("total")
          .gte("fecha", inicioDelDia(rango.desde).toISOString())
          .lte("fecha", finDelDia(rango.hasta).toISOString()),
        supabase
          .from("inversiones")
          .select("monto")
          .gte("fecha", aISO(rango.desde))
          .lte("fecha", aISO(rango.hasta)),
      ]);
      if (!vivo) return;
      setVendido(v.error ? 0 : (v.data ?? []).reduce((s, r) => s + Number(r.total), 0));
      setInvertido(i.error ? 0 : (i.data ?? []).reduce((s, r) => s + Number(r.monto), 0));
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [supabase, rango]);

  const cargarCierres = useCallback(async () => {
    const { data, error } = await supabase
      .from("patrimonio_cierres")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(13);
    if (error) {
      setAviso("Falta ejecutar el SQL de inversiones en Supabase para guardar cierres y metas.");
    } else {
      setCierres((data ?? []) as CierrePatrimonio[]);
    }
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("metas").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setMetas({ meta_semanal: Number(data.meta_semanal), meta_mensual: Number(data.meta_mensual) });
      }
    })();
    cargarCierres();
  }, [supabase, cargarCierres]);

  // Patrimonio de hoy (stock × precio)
  const pat = useMemo(() => {
    let venta = 0;
    let costo = 0;
    let sinCosto = 0;
    for (const p of productos) {
      venta += p.stock_actual * p.precio;
      costo += p.stock_actual * (p.costo ?? 0);
      if (p.stock_actual > 0 && !(p.costo && p.costo > 0)) sinCosto++;
    }
    return { venta, costo, sinCosto };
  }, [productos]);

  // Patrimonio desglosado por categoría de producto
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, { nombre: string; venta: number; costo: number; productos: number }>();
    for (const p of productos) {
      const cat = categorias.find((c) => c.id === p.categoria_id);
      const key = cat ? cat.id : "__sin";
      const fila = mapa.get(key) ?? {
        nombre: cat ? cat.nombre : "Sin categoría",
        venta: 0,
        costo: 0,
        productos: 0,
      };
      fila.venta += p.stock_actual * p.precio;
      fila.costo += p.stock_actual * (p.costo ?? 0);
      fila.productos++;
      mapa.set(key, fila);
    }
    return Array.from(mapa.entries())
      .map(([id, f]) => ({ id, ...f }))
      .filter((f) => f.id !== "__sin" || f.venta > 0 || f.costo > 0)
      .sort((a, b) => (a.id === "__sin" ? 1 : 0) - (b.id === "__sin" ? 1 : 0) || b.venta - a.venta);
  }, [productos, categorias]);

  const campoMeta = modo === "semana" ? "meta_semanal" : "meta_mensual";
  const meta = metas ? metas[campoMeta] : 0;
  const pct = meta > 0 ? Math.min(100, Math.round((vendido / meta) * 100)) : 0;
  const diferencia = vendido - meta;

  async function guardarMeta() {
    setGuardandoMeta(true);
    const valor = Math.max(0, Number(metaInput) || 0);
    const { data, error } = await supabase
      .from("metas")
      .update({ [campoMeta]: valor })
      .eq("id", 1)
      .select()
      .single();
    setGuardandoMeta(false);
    if (error || !data) {
      setAviso("No se pudo guardar la meta. ¿Ya corriste el SQL en Supabase?");
      return;
    }
    setMetas({ meta_semanal: Number(data.meta_semanal), meta_mensual: Number(data.meta_mensual) });
    setEditandoMeta(false);
  }

  async function guardarCierre() {
    setGuardandoCierre(true);
    const { error } = await supabase.from("patrimonio_cierres").upsert(
      {
        fecha: hoyISO(),
        patrimonio_venta: pat.venta,
        patrimonio_costo: pat.costo,
        productos_sin_costo: pat.sinCosto,
      },
      { onConflict: "fecha" }
    );
    setGuardandoCierre(false);
    if (error) {
      setAviso("No se pudo guardar el cierre. ¿Ya corriste el SQL en Supabase?");
      return;
    }
    setAviso(null);
    await cargarCierres();
  }

  async function borrarCierre(c: CierrePatrimonio) {
    if (!confirm(`¿Eliminar el cierre del ${fmtISOLarga(c.fecha)}?`)) return;
    const { error } = await supabase.from("patrimonio_cierres").delete().eq("id", c.id);
    if (!error) setCierres((l) => l.filter((x) => x.id !== c.id));
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {aviso && (
        <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-[12.5px] text-danger-text">
          {aviso}
        </p>
      )}

      {/* Selector de período */}
      <div>
        <div className="flex gap-1.5">
          {(["semana", "mes"] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setModo(m);
                setAncla(new Date());
                setEditandoMeta(false);
              }}
              className={`h-7 rounded px-2.5 text-[12px] font-medium transition-colors ${
                modo === m ? "bg-zinc-100 text-zinc-950" : "border border-zinc-800 text-zinc-400"
              }`}
            >
              {m === "semana" ? "Semanal" : "Mensual"}
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <button
            onClick={() => mover(-1)}
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            aria-label="Período anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-[13px] font-medium text-zinc-100">{etiquetaRango}</p>
          <button
            onClick={() => mover(1)}
            disabled={esActual}
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
            aria-label="Período siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Ingresos vs meta */}
      <section className="rounded border border-zinc-800 bg-zinc-900/50 p-3.5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-zinc-500">Ingresos (ventas)</p>
            <p className="tabular mt-0.5 text-[20px] font-semibold text-zinc-100">
              {cargando ? "…" : formatGs(vendido)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-zinc-500">Meta {modo === "semana" ? "semanal" : "mensual"}</p>
            {editandoMeta ? (
              <div className="mt-0.5 flex items-center gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  value={metaInput}
                  onChange={(e) => setMetaInput(e.target.value)}
                  className="tabular h-8 w-28 rounded border border-zinc-700 bg-zinc-950 px-2 text-right text-[13px] text-zinc-100 outline-none"
                />
                <button
                  onClick={guardarMeta}
                  disabled={guardandoMeta}
                  className="flex h-8 w-8 items-center justify-center rounded border border-ok-border text-ok-text"
                  aria-label="Guardar meta"
                >
                  {guardandoMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setEditandoMeta(false)}
                  className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-500"
                  aria-label="Cancelar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMetaInput(meta ? String(meta) : "");
                  setEditandoMeta(true);
                }}
                className="mt-0.5 flex items-center gap-1.5 text-[14px] font-medium text-zinc-300 hover:text-zinc-100"
              >
                <span className="tabular">{meta > 0 ? formatGs(meta) : "Definir meta"}</span>
                <Pencil className="h-3 w-3 text-zinc-600" />
              </button>
            )}
          </div>
        </div>

        {meta > 0 && !cargando && (
          <>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full ${vendido >= meta ? "bg-ok" : "bg-zinc-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[12px] text-zinc-400">
              {pct}% de la meta ·{" "}
              {diferencia >= 0
                ? `la superaste por ${formatGs(diferencia)}`
                : `faltan ${formatGs(Math.abs(diferencia))}`}
            </p>
          </>
        )}
      </section>

      {/* Inversión y ganancia estimada */}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
          <p className="text-[11px] text-zinc-500">Invertido</p>
          <p className="tabular mt-0.5 text-[15px] font-semibold text-zinc-100">
            {cargando ? "…" : formatGs(invertido)}
          </p>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
          <p className="text-[11px] text-zinc-500">Ganancia estimada</p>
          <p
            className={`tabular mt-0.5 text-[15px] font-semibold ${
              vendido - invertido >= 0 ? "text-ok-text" : "text-danger-text"
            }`}
          >
            {cargando ? "…" : formatGs(vendido - invertido)}
          </p>
        </div>
        <p className="col-span-2 text-[11px] text-zinc-600">
          Estimada = ventas menos inversiones del período. No descuenta el costo de cada producto vendido.
        </p>
      </section>

      {/* Patrimonio */}
      <section className="rounded border border-zinc-800 bg-zinc-900/50 p-3.5">
        <p className="text-[12px] font-medium text-zinc-300">Patrimonio de hoy (mercadería en stock)</p>
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-zinc-500">A precio de costo</p>
            <p className="tabular mt-0.5 text-[16px] font-semibold text-zinc-100">{formatGs(pat.costo)}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">A precio de venta</p>
            <p className="tabular mt-0.5 text-[16px] font-semibold text-zinc-100">{formatGs(pat.venta)}</p>
          </div>
        </div>
        {pat.sinCosto > 0 && (
          <p className="mt-2.5 rounded border border-warn-border bg-warn-bg px-2.5 py-1.5 text-[11.5px] text-warn-text">
            {pat.sinCosto} producto(s) con stock no tienen costo cargado: el total a costo sale más
            bajo que el real. Cargalos en la pestaña Costos.
          </p>
        )}
        {categorias.length > 0 && (
          <div className="mt-3 overflow-hidden rounded border border-zinc-800">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-zinc-900 px-3 py-1.5 text-[10.5px] text-zinc-500">
              <span>Categoría</span>
              <span className="w-24 text-right">A costo</span>
              <span className="w-24 text-right">A venta</span>
            </div>
            <div className="divide-y divide-zinc-900">
              {porCategoria.map((f) => (
                <div
                  key={f.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className={`truncate text-[12.5px] ${f.id === "__sin" ? "text-zinc-500" : "text-zinc-100"}`}>
                      {f.nombre}
                    </p>
                    <p className="text-[10.5px] text-zinc-600">{f.productos} producto(s)</p>
                  </div>
                  <span className="tabular w-24 text-right text-[12px] text-zinc-300">{formatGs(f.costo)}</span>
                  <span className="tabular w-24 text-right text-[12px] text-zinc-300">{formatGs(f.venta)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={guardarCierre}
          disabled={guardandoCierre}
          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded bg-zinc-100 text-[13px] font-medium text-zinc-950 transition-colors hover:bg-white disabled:opacity-60"
        >
          {guardandoCierre && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cierre de hoy
        </button>
        <p className="mt-1.5 text-[11px] text-zinc-600">
          Guarda una foto del patrimonio para comparar semana a semana. Si guardás dos veces el mismo
          día, se reemplaza.
        </p>
      </section>

      {/* Cierres guardados */}
      <section>
        <p className="mb-2 text-[12px] font-medium text-zinc-300">Cierres guardados</p>
        {cierres.length === 0 ? (
          <p className="rounded border border-zinc-800 px-3 py-6 text-center text-[12.5px] text-zinc-500">
            Todavía no guardaste ningún cierre
          </p>
        ) : (
          <div className="divide-y divide-zinc-900 rounded border border-zinc-800">
            {cierres.map((c, idx) => {
              const ant = cierres[idx + 1];
              return (
                <div key={c.id} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-zinc-100">{fmtISOLarga(c.fecha)}</p>
                    <p className="tabular mt-1 text-[12px] text-zinc-400">
                      Costo: {formatGs(Number(c.patrimonio_costo))}
                      {ant && (
                        <span className="ml-1.5 text-[11px] text-zinc-500">
                          {delta(Number(c.patrimonio_costo) - Number(ant.patrimonio_costo))}
                        </span>
                      )}
                    </p>
                    <p className="tabular text-[12px] text-zinc-400">
                      Venta: {formatGs(Number(c.patrimonio_venta))}
                      {ant && (
                        <span className="ml-1.5 text-[11px] text-zinc-500">
                          {delta(Number(c.patrimonio_venta) - Number(ant.patrimonio_venta))}
                        </span>
                      )}
                    </p>
                    {c.productos_sin_costo > 0 && (
                      <p className="mt-0.5 text-[11px] text-warn-text">
                        {c.productos_sin_costo} sin costo en ese momento
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => borrarCierre(c)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-600 hover:text-danger-text"
                    aria-label="Eliminar cierre"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
