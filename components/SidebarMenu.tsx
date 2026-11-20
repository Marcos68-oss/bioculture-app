"use client";

import { LogOut, PanelLeftClose, X } from "lucide-react";
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

function Contenido({
  grupos,
  activo,
  userEmail,
  onLogout,
  onClose,
}: {
  grupos: MenuGroup[];
  activo: string;
  userEmail: string;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="safe-top border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="text-[13.5px] font-medium text-zinc-100">BIOCULTURE</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 text-zinc-500 hover:text-zinc-300"
              aria-label="Ocultar menú"
              title="Ocultar menú"
            >
              <X className="h-4 w-4 lg:hidden" />
              <PanelLeftClose className="hidden h-4 w-4 lg:block" />
            </button>
          )}
        </div>
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
              const esActivo = it.key === activo;
              return (
                <button
                  key={it.key}
                  onClick={it.onClick}
                  aria-current={esActivo ? "page" : undefined}
                  className={`flex h-11 w-full items-center gap-3 rounded px-3 text-left text-[13.5px] transition-colors ${
                    esActivo
                      ? "bg-zinc-900 font-medium text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
                  }`}
                >
                  <Icono
                    className={`h-[18px] w-[18px] shrink-0 ${esActivo ? "text-ok-text" : "text-zinc-500"}`}
                    strokeWidth={1.75}
                  />
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
    </>
  );
}

export default function SidebarMenu({
  open,
  onClose,
  grupos,
  activo,
  userEmail,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  grupos: MenuGroup[];
  activo: string;
  userEmail: string;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Celular: se desliza y se cierra al elegir. PC: queda fijo hasta que lo ocultes. */}
      <div
        className={`fixed inset-0 z-40 lg:pointer-events-none lg:z-20 ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 lg:hidden ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <nav
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 lg:pointer-events-auto lg:w-64 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Contenido
            grupos={grupos}
            activo={activo}
            userEmail={userEmail}
            onLogout={onLogout}
            onClose={onClose}
          />
        </nav>
      </div>
    </>
  );
}
