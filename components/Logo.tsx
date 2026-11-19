"use client";

import { useState } from "react";

// Logo de BIOCULTURE en círculo (usa public/icons/icon-192.png, el mismo de la app).
// Si la imagen no carga, muestra la "Y" de antes.
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-[12px] font-semibold text-ok-text ${className}`}
      >
        Y
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-[#bddba9] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt="BIOCULTURE"
        onError={() => setFallo(true)}
        draggable={false}
        className="absolute left-1/2 top-1/2 h-full w-full max-w-none -translate-x-1/2 -translate-y-1/2 scale-[1.18]"
      />
    </div>
  );
}
