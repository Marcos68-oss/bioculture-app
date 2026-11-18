"use client";

import { LogOut, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";

export type MenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

export type MenuGroup = {
  titulo?: string;
  items: MenuItem[];
};

export default function SidebarMenu({
  open,
  onClose,
  grupos,
  userEmail,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  grupos: MenuGroup[];
  userEmail: string;
  onLogout: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Fondo oscuro */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel lateral */}
      <nav
        className={`absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="safe-top flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="text-[13.5px] font-medium text-zinc-100">BIOCULTURE</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {grupos.map((g, i) => (
            <div key={g.titulo ?? i} className={i > 0 ? "mt-4" : ""}>
              {g.titulo && (
                <p className="px-3 pb-1.5 text-[10.5px] font-medium uppercase tracking-wide text-zinc-600">
                  {g.titulo}
                </p>
              )}
              {g.items.map((it) => {
                const Icono = it.icon;
                return (
                  <button
                    key={it.key}
                    onClick={it.onClick}
                    className="flex h-11 w-full items-center gap-3 rounded px-3 text-left text-[13.5px] text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 active:bg-zinc-900"
                  >
                    <Icono className="h-[18px] w-[18px] shrink-0 text-zinc-500" strokeWidth={1.75} />
                    {it.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="safe-bottom border-t border-zinc-800 px-2 py-3">
          <p className="truncate px-3 pb-1.5 text-[11px] text-zinc-600">{userEmail}</p>
          <button
            onClick={onLogout}
            className="flex h-11 w-full items-center gap-3 rounded px-3 text-left text-[13.5px] text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-zinc-500" strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </div>
      </nav>
    </div>
  );
}
