import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Venta, formatGs } from "./types";

const NEGOCIO = "BIOCULTURE";
const SUBTITULO = "Remedios naturales";

function encabezado(doc: jsPDF, titulo: string) {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(NEGOCIO, 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text(SUBTITULO, 14, 24);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, 14, 36);
}

function pie(doc: jsPDF) {
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generado el ${new Date().toLocaleDateString("es-PY")} — Página ${i} de ${paginas}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
  }
}

/** Nota de venta individual (tipo comprobante para un cliente) */
export function generarNotaVenta(venta: Venta) {
  const doc = new jsPDF();
  encabezado(doc, "Nota de venta");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fecha = new Date(venta.fecha).toLocaleString("es-PY", {
    dateStyle: "long",
    timeStyle: "short",
  });
  doc.text(`Cliente: ${venta.cliente}`, 14, 46);
  doc.text(`Fecha: ${fecha}`, 14, 52);
  doc.text(`N.° de venta: ${venta.id.slice(0, 8).toUpperCase()}`, 14, 58);

  autoTable(doc, {
    startY: 66,
    margin: { left: 14, right: 14 },
    head: [["Código", "Producto", "Cant.", "P. unitario", "Subtotal"]],
    body: venta.venta_items.map((item) => [
      item.producto_codigo,
      item.producto_nombre,
      String(item.cantidad),
      formatGs(item.precio_unitario),
      formatGs(item.subtotal),
    ]),
    theme: "grid",
    headStyles: { fillColor: [39, 39, 42], textColor: 255, fontSize: 9, halign: "left" },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 }, // Ancho fijo para código
      1: { cellWidth: "auto" }, // El producto toma el espacio libre restante
      2: { cellWidth: 20, halign: "center" }, // Cantidad centrada
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
  });

  // @ts-expect-error — lastAutoTable lo agrega el plugin en runtime
  const finalY = doc.lastAutoTable.finalY as number;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  // Alineado a 14mm del borde derecho exacto
  doc.text(`Total: ${formatGs(venta.total)}`, pageWidth - 14, finalY + 10, { align: "right" });

  pie(doc);
  doc.save(`nota-venta-${venta.id.slice(0, 8)}.pdf`);
}

/** Reporte de ventas de un período (rango de fechas) */
export function generarReportePeriodo(
  ventas: Venta[],
  desde: Date,
  hasta: Date,
  etiquetaPeriodo: string
) {
  const doc = new jsPDF();
  encabezado(doc, `Reporte de ventas — ${etiquetaPeriodo}`);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Del ${desde.toLocaleDateString("es-PY")} al ${hasta.toLocaleDateString("es-PY")}`,
    14,
    46
  );

  const totalGeneral = ventas.reduce((s, v) => s + v.total, 0);
  const totalUnidades = ventas.reduce(
    (s, v) => s + v.venta_items.reduce((si, it) => si + it.cantidad, 0),
    0
  );
  doc.text(`Ventas: ${ventas.length}   ·   Unidades vendidas: ${totalUnidades}`, 14, 52);

  // Tabla 1: detalle por venta
  autoTable(doc, {
    startY: 60,
    margin: { left: 14, right: 14 },
    head: [["Fecha", "Cliente", "Ítems", "Total"]],
    body: ventas.map((v) => [
      new Date(v.fecha).toLocaleDateString("es-PY"),
      v.cliente,
      String(v.venta_items.reduce((s, it) => s + it.cantidad, 0)),
      formatGs(v.total),
    ]),
    theme: "grid",
    headStyles: { fillColor: [39, 39, 42], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 
      0: { cellWidth: 35 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 25, halign: "center" }, 
      3: { cellWidth: 40, halign: "right" } 
    },
  });

  // Tabla 2: totales por producto
  const porProducto = new Map<string, { nombre: string; cantidad: number; total: number }>();
  for (const v of ventas) {
    for (const item of v.venta_items) {
      const key = item.producto_codigo;
      const actual = porProducto.get(key) ?? {
        nombre: item.producto_nombre,
        cantidad: 0,
        total: 0,
      };
      actual.cantidad += item.cantidad;
      actual.total += item.subtotal;
      porProducto.set(key, actual);
    }
  }
  const filasProducto = Array.from(porProducto.entries()).sort((a, b) => b[1].total - a[1].total);

  // @ts-expect-error — lastAutoTable lo agrega el plugin en runtime
  const y1 = doc.lastAutoTable.finalY as number;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Totales por producto", 14, y1 + 12);

  autoTable(doc, {
    startY: y1 + 16,
    margin: { left: 14, right: 14 },
    head: [["Código", "Producto", "Cant. vendida", "Total"]],
    body: filasProducto.map(([codigo, d]) => [
      codigo,
      d.nombre,
      String(d.cantidad),
      formatGs(d.total),
    ]),
    theme: "grid",
    headStyles: { fillColor: [39, 39, 42], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 
      0: { cellWidth: 30 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 30, halign: "center" }, 
      3: { cellWidth: 40, halign: "right" } 
    },
  });

  // @ts-expect-error — lastAutoTable lo agrega el plugin en runtime
  const y2 = doc.lastAutoTable.finalY as number;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total del período: ${formatGs(totalGeneral)}`, pageWidth - 14, y2 + 10, { align: "right" });

  pie(doc);
  doc.save(`reporte-ventas-${desde.toISOString().slice(0, 10)}-a-${hasta.toISOString().slice(0, 10)}.pdf`);
}
