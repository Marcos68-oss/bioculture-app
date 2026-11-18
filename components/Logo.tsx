"use client";

import { useState } from "react";

// Logo de BIOCULTURE (usa public/icons/icon-192.png, el mismo de la app).
// Se recorta sobre el mate para que se vea bien en tamaño chico.
// Si la imagen no carga, muestra la "Y" de antes.
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    return (
      <div
        className={`flex items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-[12px] font-semibold text-ok-text ${className}`}
      >
        Y
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 overflow-hidden rounded border border-zinc-800 bg-[#bcdcaa] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt="BIOCULTURE"
        onError={() => setFallo(true)}
        draggable={false}
        className="absolute max-w-none"
        style={{ width: "270%", left: "-82.3%", top: "-79.6%" }}
      />
    </div>
  );
}
