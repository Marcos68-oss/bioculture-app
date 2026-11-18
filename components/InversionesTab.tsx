"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, FileDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Inversion, Producto, CATEGORIAS_INVERSION, labelCategoria, formatGs } from "@/lib/types";
import {
  aISO,
  hoyISO,
  parseISO,
  inicioSemana,
  finSemana,
  inicioMes,
  finMes,
  inicioDelDia,
  finDelDia,
  fmtISOCorta,
} from "@/lib/fechas";
import InversionForm from "@/components/InversionForm";
import { generarReporteInversiones } from "@/lib/pdf-inversiones";

type Periodo = "hoy" | "semana" | "mes" | "rango";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "rango", label: "Rango" },
];

const BADGE: Record<string, string> = {
  mercaderia: "bg-ok-bg text-ok-text border-ok-border",
  transporte: "bg-warn-bg text-warn-text border-warn-border",
  otros: "bg-zinc-900 text-zinc-400 border-zinc-800",
};

export default function InversionesTab({
  productos,
  onStockCambiado,
  onProductoCreado,
}: {
  productos: Producto[];
  onStockCambiado: () => void | Promise<void>;
  onProductoCreado: (p: Producto) => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [rDesde, setRDesde] = useState(hoyISO());
  const [rHasta, setRHasta] = useState(hoyISO());
  const [items, setItems] = useState<Inversion[]>([]);
  const [totalHoy, setTotalHoy] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Inversion | null>(null);
  const [exportando, setExportando] = useState(false);

  const { desde, hasta, etiqueta } = useMemo(() => {
    const hoy = new Date();
    if (periodo === "hoy") return { desde: aISO(hoy), hasta: aISO(hoy), etiqueta: "Hoy" };
    if (periodo === "semana")
      return { desde: aISO(inicioSemana(hoy)), hasta: aISO(finSemana(hoy)), etiqueta: "Esta semana" };
    if (periodo === "mes")
      return { desde: aISO(inicioMes(hoy)), hasta: aISO(finMes(hoy)), etiqueta: "Este mes" };
    return { desde: rDesde, hasta: rHasta, etiqueta: "Período personalizado" };
  }, [periodo, rDesde, rHasta]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const hoy = new Date();
    const [lista, mes] = await Promise.all([
      supabase
        .from("inversiones")
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("inversiones")
        .select("fecha, monto")
        .gte("fecha", aISO(inicioMes(hoy)))
        .lte("fecha", aISO(finMes(hoy))),
    ]);

    if (lista.error) {
      setError("No se pudieron cargar las inversiones. ¿Ya corriste el SQL en Supabase?");
      setItems([]);
    } else {
      setItems((lista.data ?? []) as Inversion[]);
    }

    const filasMes = (mes.data ?? []) as { fecha: string; monto: number }[];
    const hoyStr = hoyISO();
    setTotalMes(filasMes.reduce((s, f) => s + Number(f.monto), 0));
    setTotalHoy(filasMes.filter((f) => f.fecha === hoyStr).reduce((s, f) => s + Number(f.monto), 0));
    setLoading(false);
  }, [supabase, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPeriodo = items.reduce((s, i) => s + Number(i.monto), 0);

  async function alGuardar() {
    setFormOpen(false);
    setEditando(null);
    await Promise.all([cargar(), onStockCambiado()]);
  }

  async function exportarPDF() {
    setExportando(true);
    let totalVentas: number | null = null;
    const { data, error: err } = await supabase
      .from("ventas")
      .select("total")
      .gte("fecha", inicioDelDia(parseISO(desde)).toISOString())
      .lte("fecha", finDelDia(parseISO(hasta)).toISOString());
    if (!err && data) totalVentas = data.reduce((s, v) => s + Number(v.total), 0);

    generarReporteInversiones({ inversiones: items, desde, hasta, etiqueta, totalVentas });
    setExportando(false);
  }

  return (
    <div className="px-4 py-4">
      {/* Totales */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
          <p className="text-[11px] text-zinc-500">Invertido hoy</p>
          <p className="tabular mt-0.5 text-[16px] font-semibold text-zinc-100">{formatGs(totalHoy)}</p>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
          <p className="text-[11px] text-zinc-500">Invertido este mes</p>
          <p className="tabular mt-0.5 text-[16px] font-semibold text-zinc-100">{formatGs(totalMes)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-4 flex gap-1.5">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`h-7 rounded px-2.5 text-[12px] font-medium transition-colors ${
              periodo === p.value
                ? "bg-zinc-100 text-zinc-950"
                : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodo === "rango" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="date"
            value={rDesde}
            onChange={(e) => setRDesde(e.target.value)}
            className="h-9 rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13px] text-zinc-100 outline-none [color-scheme:dark] focus:border-zinc-600"
          />
          <input
            type="date"
            value={rHasta}
            onChange={(e) => setRHasta(e.target.value)}
            className="h-9 rounded border border-zinc-800 bg-zinc-900 px-2.5 text-[13px] text-zinc-100 outline-none [color-scheme:dark] focus:border-zinc-600"
          />
        </div>
      )}

      {/* Resumen del período */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-zinc-400">
            {etiqueta} · {items.length} registro(s)
          </p>
          <p className="tabular text-[14px] font-semibold text-zinc-100">{formatGs(totalPeriodo)}</p>
        </div>
        <button
          onClick={exportarPDF}
          disabled={items.length === 0 || exportando}
          className="flex shrink-0 items-center gap-1.5 rounded border border-zinc-800 px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-300 transition-colors hover:border-zinc-600 disabled:opacity-40"
        >
          {exportando ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
          Reporte PDF
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIAS_INVERSION.map((c) => {
            const total = items
              .filter((i) => i.categoria === c.value)
              .reduce((s, i) => s + Number(i.monto), 0);
            if (total === 0) return null;
            return (
              <span
                key={c.value}
                className={`rounded border px-1.5 py-0.5 text-[11px] ${BADGE[c.value]}`}
              >
                {c.label}: {formatGs(total)}
              </span>
            );
          })}
        </div>
      )}

      {/* Lista */}
      <div className="mt-3 divide-y divide-zinc-900 rounded border border-zinc-800">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
          </div>
        ) : error ? (
          <p className="px-3 py-8 text-center text-[12.5px] text-danger-text">{error}</p>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[13px] text-zinc-500">Sin inversiones en este período</p>
          </div>
        ) : (
          items.map((i) => (
            <button
              key={i.id}
              onClick={() => {
                setEditando(i);
                setFormOpen(true);
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900/60"
            >
              <span className="w-10 shrink-0 font-mono text-[11.5px] text-zinc-500">
                {fmtISOCorta(i.fecha)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-zinc-100">{i.concepto}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`inline-flex rounded border px-1.5 py-0.5 text-[10.5px] font-medium leading-none ${BADGE[i.categoria]}`}
                  >
                    {labelCategoria(i.categoria)}
                  </span>
                  {i.categoria === "mercaderia" && i.cantidad ? (
                    <span className="truncate text-[11px] text-zinc-500">
                      +{i.cantidad} × {i.producto_nombre ?? "producto eliminado"}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="tabular shrink-0 text-[13px] font-semibold text-zinc-100">
                {formatGs(Number(i.monto))}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Botón agregar */}
      <button
        onClick={() => {
          setEditando(null);
          setFormOpen(true);
        }}
        className="safe-bottom fixed bottom-5 right-4 z-10 flex h-12 items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-100 px-4 text-[13px] font-medium text-zinc-950 shadow-subtle transition-transform active:scale-95"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} />
        Inversión
      </button>

      <InversionForm
        open={formOpen}
        inversion={editando}
        productos={productos}
        onClose={() => {
          setFormOpen(false);
          setEditando(null);
        }}
        onGuardado={alGuardar}
        onProductoCreado={onProductoCreado}
      />
    </div>
  );
}
