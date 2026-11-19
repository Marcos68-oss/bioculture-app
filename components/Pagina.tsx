"use client";

import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Marco común de las páginas internas (Ventas, Historial, Inversiones, etc.).
// Muestra el botón ☰ para abrir el menú lateral.
export default function Pagina({
  titulo,
  icono: Icono,
  onMenu,
  ancho = "max-w-3xl",
  relleno = "pb-28",
  children,
}: {
  titulo: string;
  icono: LucideIcon;
  onMenu: () => void;
  ancho?: string;
  relleno?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-dvh ${relleno}`}>
      <header className="safe-top sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <button
            onClick={onMenu}
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" strokeWidth={2} />
          </button>
          <Icono className="h-4 w-4 text-zinc-500" strokeWidth={1.75} />
          <h1 className="text-[14px] font-medium text-zinc-100">{titulo}</h1>
        </div>
      </header>
      <div className={`mx-auto w-full ${ancho}`}>{children}</div>
    </div>
  );
}
