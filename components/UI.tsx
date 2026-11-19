"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";

// Avisos de confirmación y menú de clic derecho propios del sistema
// (reemplazan a los cuadros que trae el navegador).

export type ConfirmOpts = {
  titulo: string;
  mensaje?: string;
  confirmar?: string; // texto del botón principal
  cancelar?: string;
  peligro?: boolean; // botón rojo (eliminar)
};

export type MenuCtxItem = {
  label: string;
  icono?: LucideIcon;
  onClick: () => void;
  peligro?: boolean;
  deshabilitado?: boolean;
  separadorArriba?: boolean;
};

type EventoMenu = { preventDefault: () => void; clientX: number; clientY: number };

type UICtx = {
  confirmar: (o: ConfirmOpts) => Promise<boolean>;
  abrirMenu: (e: EventoMenu, items: MenuCtxItem[]) => void;
};

const Ctx = createContext<UICtx | null>(null);

// Si por algún motivo no hay proveedor, cae al aviso del navegador (no se rompe nada).
export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (c) return c;
  return {
    confirmar: async (o) =>
      window.confirm(o.mensaje ? `${o.titulo}\n\n${o.mensaje}` : o.titulo),
    abrirMenu: () => {},
  };
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuCtxItem[] } | null>(null);

  const confirmar = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })),
    []
  );

  const abrirMenu = useCallback((e: EventoMenu, items: MenuCtxItem[]) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const value = useMemo(() => ({ confirmar, abrirMenu }), [confirmar, abrirMenu]);

  function cerrarDialogo(v: boolean) {
    dlg?.resolve(v);
    setDlg(null);
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {dlg && <Dialogo dlg={dlg} onCerrar={cerrarDialogo} />}
      {menu && <MenuFlotante menu={menu} onCerrar={() => setMenu(null)} />}
    </Ctx.Provider>
  );
}

function Dialogo({
  dlg,
  onCerrar,
}: {
  dlg: ConfirmOpts;
  onCerrar: (v: boolean) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={() => onCerrar(false)}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={dlg.titulo}
        className="relative z-10 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-subtle"
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
              dlg.peligro
                ? "border-danger-border bg-danger-bg text-danger-text"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-medium text-zinc-100">{dlg.titulo}</h2>
            {dlg.mensaje && (
              <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-400">
                {dlg.mensaje}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            autoFocus={!!dlg.peligro}
            onClick={() => onCerrar(false)}
            className="h-9 rounded border border-zinc-800 px-3.5 text-[13px] font-medium text-zinc-300 transition-colors hover:border-zinc-600"
          >
            {dlg.cancelar ?? "Cancelar"}
          </button>
          <button
            autoFocus={!dlg.peligro}
            onClick={() => onCerrar(true)}
            className={`h-9 rounded px-3.5 text-[13px] font-medium transition-colors ${
              dlg.peligro
                ? "bg-danger text-zinc-50 hover:opacity-90"
                : "bg-zinc-100 text-zinc-950 hover:bg-white"
            }`}
          >
            {dlg.confirmar ?? "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuFlotante({
  menu,
  onCerrar,
}: {
  menu: { x: number; y: number; items: MenuCtxItem[] };
  onCerrar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Lo acomoda para que no se salga de la pantalla
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - height - 8)),
    });
  }, [menu]);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCerrar();
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("mousedown", fuera);
    window.addEventListener("keydown", tecla);
    window.addEventListener("resize", onCerrar);
    window.addEventListener("blur", onCerrar);
    window.addEventListener("scroll", onCerrar, true);
    return () => {
      document.removeEventListener("mousedown", fuera);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", onCerrar);
      window.removeEventListener("blur", onCerrar);
      window.removeEventListener("scroll", onCerrar, true);
    };
  }, [onCerrar]);

  return (
    <div
      ref={ref}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: pos?.x ?? menu.x, top: pos?.y ?? menu.y, visibility: pos ? "visible" : "hidden" }}
      className="fixed z-[80] min-w-[190px] overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 py-1 shadow-subtle"
    >
      {menu.items.map((it, i) => {
        const Icono = it.icono;
        return (
          <div key={i}>
            {it.separadorArriba && <div className="my-1 border-t border-zinc-900" />}
            <button
              role="menuitem"
              disabled={it.deshabilitado}
              onClick={() => {
                onCerrar();
                it.onClick();
              }}
              className={`flex h-9 w-full items-center gap-2.5 px-3 text-left text-[13px] transition-colors disabled:opacity-40 ${
                it.peligro
                  ? "text-danger-text hover:bg-danger-bg"
                  : "text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {Icono && (
                <Icono
                  className={`h-4 w-4 shrink-0 ${it.peligro ? "" : "text-zinc-500"}`}
                  strokeWidth={1.75}
                />
              )}
              {it.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
