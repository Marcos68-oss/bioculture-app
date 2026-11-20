"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { MESES, aISO, fmtISOLarga, hoyISO, parseISO } from "@/lib/fechas";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"]; // la semana empieza el lunes

// Calendario propio del sistema (reemplaza al calendario del navegador).
// Recibe y entrega la fecha como "AAAA-MM-DD".
export default function SelectorFecha({
  valor,
  onCambio,
  titulo = "Elegir fecha",
  ariaLabel,
  className = "",
}: {
  valor: string;
  onCambio: (iso: string) => void;
  titulo?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => parseISO(valor || hoyISO()));

  function abrir() {
    setMes(parseISO(valor || hoyISO()));
    setAbierto(true);
  }

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  const anio = mes.getFullYear();
  const m = mes.getMonth();
  const vacios = (new Date(anio, m, 1).getDay() + 6) % 7;
  const diasDelMes = new Date(anio, m + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array.from({ length: vacios }, () => null),
    ...Array.from({ length: diasDelMes }, (_, i) => i + 1),
  ];
  const hoy = hoyISO();

  function elegir(iso: string) {
    onCambio(iso);
    setAbierto(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={ariaLabel ?? titulo}
        aria-haspopup="dialog"
        className={`flex w-full items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900 px-2.5 text-left text-zinc-100 outline-none transition-colors hover:border-zinc-600 focus:border-zinc-600 ${className}`}
      >
        <span className={`tabular truncate ${valor ? "" : "text-zinc-500"}`}>
          {valor ? fmtISOLarga(valor) : "Elegir fecha"}
        </span>
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setAbierto(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label={titulo}
            className="safe-bottom relative z-10 w-full max-w-sm rounded-t-lg border border-zinc-800 bg-zinc-950 shadow-subtle sm:rounded-lg"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 className="text-[13.5px] font-medium text-zinc-100">{titulo}</h2>
              <button
                onClick={() => setAbierto(false)}
                className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-3 py-3">
              {/* Mes y año */}
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={() => setMes(new Date(anio, m - 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-[13.5px] font-medium text-zinc-100">
                  {MESES[m]} {anio}
                </p>
                <button
                  onClick={() => setMes(new Date(anio, m + 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Días */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {DIAS.map((d, i) => (
                  <span key={i} className="py-1 text-[11px] font-medium text-zinc-600">
                    {d}
                  </span>
                ))}
                {celdas.map((dia, i) => {
                  if (dia === null) return <span key={`v${i}`} />;
                  const iso = aISO(new Date(anio, m, dia));
                  const sel = iso === valor;
                  const esHoy = iso === hoy;
                  return (
                    <button
                      key={iso}
                      onClick={() => elegir(iso)}
                      aria-pressed={sel}
                      className={`tabular h-9 rounded text-[13px] transition-colors ${
                        sel
                          ? "bg-zinc-100 font-semibold text-zinc-950"
                          : esHoy
                          ? "border border-ok-border text-ok-text hover:bg-zinc-900"
                          : "text-zinc-300 hover:bg-zinc-900"
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-between border-t border-zinc-900 pt-3">
                <button
                  onClick={() => elegir(hoy)}
                  className="h-8 rounded border border-zinc-800 px-3 text-[12.5px] text-zinc-300 hover:border-zinc-600"
                >
                  Hoy
                </button>
                <button
                  onClick={() => setAbierto(false)}
                  className="h-8 rounded px-3 text-[12.5px] text-zinc-500 hover:text-zinc-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
