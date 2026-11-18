import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Inversion, CATEGORIAS_INVERSION, labelCategoria, formatGs } from "./types";
import { fmtISOLarga } from "./fechas";

const gs = (n: number) => formatGs(n).replace(/₲/g, "Gs.");

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

/** Reporte de inversiones de un período, con totales por categoría */
export function generarReporteInversiones(opts: {
  inversiones: Inversion[];
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  etiqueta: string;
  totalVentas: number | null;
}) {
  const { inversiones, desde, hasta, etiqueta, totalVentas } = opts;
  const doc = new jsPDF();
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("BIOCULTURE", 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text("Remedios naturales", 14, 24);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Reporte de inversiones - ${etiqueta}`, 14, 36);

  const ordenadas = [...inversiones].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const totalInvertido = ordenadas.reduce((s, i) => s + Number(i.monto), 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Del ${fmtISOLarga(desde)} al ${fmtISOLarga(hasta)}`, 14, 46);
  doc.text(`Registros: ${ordenadas.length}`, 14, 52);
  doc.text(`Total invertido: ${gs(totalInvertido)}`, 14, 58);

  let y = 64;
  if (totalVentas !== null) {
    doc.text(`Ventas del periodo: ${gs(totalVentas)}`, 14, 64);
    doc.setFont("helvetica", "bold");
    doc.text(`Ganancia estimada: ${gs(totalVentas - totalInvertido)}`, 14, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Estimada: ventas menos inversiones del periodo.", 14, 75);
    doc.setTextColor(0);
    y = 82;
  } else {
    y = 68;
  }

  // Totales por categoría
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Totales por categoria", 14, y);
  autoTable(doc, {
    startY: y + 3,
    margin: { left: 14, right: 14 },
    head: [["Categoria", "Registros", "Total"]],
    body: CATEGORIAS_INVERSION.map((c) => {
      const filas = ordenadas.filter((i) => i.categoria === c.value);
      return [c.label, String(filas.length), gs(filas.reduce((s, i) => s + Number(i.monto), 0))];
    }),
    theme: "grid",
    headStyles: { fillColor: [39, 39, 42], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 25, halign: "center" }, 2: { cellWidth: 45, halign: "right" } },
  });

  // Detalle
  const y2 = finalY(doc) + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Detalle", 14, y2);
  autoTable(doc, {
    startY: y2 + 3,
    margin: { left: 14, right: 14 },
    head: [["Fecha", "Categoria", "Concepto", "Producto", "Monto"]],
    body: ordenadas.map((i) => [
      fmtISOLarga(i.fecha),
      labelCategoria(i.categoria),
      i.concepto + (i.nota ? ` (${i.nota})` : ""),
      i.categoria === "mercaderia" ? `${i.cantidad ?? ""} x ${i.producto_nombre ?? "-"}` : "-",
      gs(Number(i.monto)),
    ]),
    theme: "grid",
    headStyles: { fillColor: [39, 39, 42], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 26 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 40 },
      4: { cellWidth: 32, halign: "right" },
    },
  });

  const y3 = finalY(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total invertido: ${gs(totalInvertido)}`, ancho - 14, y3 + 10, { align: "right" });

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(
      `Generado el ${new Date().toLocaleDateString("es-PY")} - Pagina ${p} de ${paginas}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
  }

  doc.save(`reporte-inversiones-${desde}-a-${hasta}.pdf`);
}
