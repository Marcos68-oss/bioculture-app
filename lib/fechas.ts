// Ayudas de fechas (hora local del dispositivo). La semana va de lunes a domingo.

const pad = (n: number) => String(n).padStart(2, "0");

export function aISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hoyISO(): string {
  return aISO(new Date());
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function finDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function sumarDias(d: Date, n: number): Date {
  const x = inicioDelDia(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function inicioSemana(d: Date): Date {
  const x = inicioDelDia(d);
  const diaDesdeLunes = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diaDesdeLunes);
  return x;
}

export function finSemana(d: Date): Date {
  return sumarDias(inicioSemana(d), 6);
}

export function inicioMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function finMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "2026-11-16" -> "16/11" */
export function fmtISOCorta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** "2026-11-16" -> "16/11/2026" */
export function fmtISOLarga(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Date -> "16/11" */
export function fmtCorta(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
