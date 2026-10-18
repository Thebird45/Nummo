import PDFDocument from "pdfkit";
import { env } from "../config/env.js";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const COLOR_TEXTO = "#0f172a";
const COLOR_SUAVE = "#64748b";
const COLOR_BARRA = "#059669";
const COLOR_FONDO = "#f1f5f9";
const LEFT = 50;
const WIDTH = 512;

const TITULO_SERIE = { dia: "Ventas por día", semana: "Ventas por semana", mes: "Ventas por mes" };

function fecha(value, opciones = {}) {
  return new Date(value).toLocaleDateString("es-CO", { timeZone: env.timezone, ...opciones });
}

function etiquetaPeriodo(periodo, agrupacion) {
  if (agrupacion === "mes") {
    return new Date(`${periodo}-01T12:00:00Z`).toLocaleDateString("es-CO", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  const [, mes, dia] = periodo.split("-");
  return `${dia}/${mes}`;
}

function seccion(doc, titulo) {
  if (doc.y > 640) doc.addPage();
  doc.moveDown(1.2).font("Helvetica-Bold").fontSize(12).fillColor(COLOR_TEXTO).text(titulo, LEFT);
  doc.moveDown(0.4);
}

// columnas: [{ titulo, ancho, alinear }]; filas: arrays de texto
function tabla(doc, columnas, filas) {
  const fila = (valores, negrita) => {
    if (doc.y > 700) doc.addPage();
    const y = doc.y;
    let x = LEFT;
    doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(negrita ? COLOR_SUAVE : COLOR_TEXTO);
    columnas.forEach((col, i) => {
      doc.text(valores[i], x + 4, y, { width: col.ancho - 8, align: col.alinear || "left", lineBreak: false, ellipsis: true });
      x += col.ancho;
    });
    doc.y = y + 16;
    doc.moveTo(LEFT, doc.y - 3).lineTo(LEFT + WIDTH, doc.y - 3).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  };

  fila(columnas.map((c) => c.titulo), true);
  if (filas.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor(COLOR_SUAVE).text("Sin datos en el periodo", LEFT + 4);
    return;
  }
  filas.forEach((valores) => fila(valores, false));
}

function grafica(doc, serie, agrupacion) {
  const alto = 140;
  const top = doc.y + 6;
  const base = top + alto;
  const maximo = Math.max(...serie.map((p) => p.total), 1);
  const paso = WIDTH / serie.length;
  const anchoBarra = Math.max(Math.min(paso * 0.7, 40), 1);

  doc.font("Helvetica").fontSize(7).fillColor(COLOR_SUAVE).text(cop.format(maximo), LEFT, top - 4);
  doc.moveTo(LEFT, base).lineTo(LEFT + WIDTH, base).strokeColor("#cbd5e1").lineWidth(0.5).stroke();

  // Maximo ~12 etiquetas para que no se monten
  const cadaCuanto = Math.ceil(serie.length / 12);
  serie.forEach((punto, i) => {
    const x = LEFT + i * paso + (paso - anchoBarra) / 2;
    const h = (punto.total / maximo) * (alto - 14);
    if (h > 0) doc.rect(x, base - h, anchoBarra, h).fill(COLOR_BARRA);
    if (i % cadaCuanto === 0) {
      doc.fillColor(COLOR_SUAVE).fontSize(7)
        .text(etiquetaPeriodo(punto.periodo, agrupacion), LEFT + i * paso - 10, base + 4, { width: paso + 20, align: "center", lineBreak: false });
    }
  });

  doc.y = base + 18;
}

export function buildReportPdf({ negocio, inicio, fin, resumen }) {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });

  doc.font("Helvetica-Bold").fontSize(18).fillColor(COLOR_TEXTO).text(negocio.name, LEFT, 50);
  doc.font("Helvetica").fontSize(10).fillColor(COLOR_SUAVE).text(`NIT: ${negocio.nit}`);

  doc.font("Helvetica-Bold").fontSize(14).fillColor(COLOR_TEXTO)
    .text("Reporte de ventas", LEFT, 50, { align: "right", width: WIDTH });
  doc.font("Helvetica").fontSize(10).fillColor(COLOR_SUAVE)
    .text(`${fecha(inicio)} - ${fecha(fin)}`, { align: "right", width: WIDTH })
    .text(`Generado: ${new Date().toLocaleString("es-CO", { timeZone: env.timezone, dateStyle: "short", timeStyle: "short" })}`, { align: "right", width: WIDTH });

  const kpis = [
    ["Total ventas", cop.format(resumen.totalVentas)],
    ["Transacciones", String(resumen.transacciones)],
    ["Ticket promedio", cop.format(resumen.ticketPromedio)]
  ];
  const kpiTop = 115;
  const kpiAncho = (WIDTH - 20) / 3;
  kpis.forEach(([titulo, valor], i) => {
    const x = LEFT + i * (kpiAncho + 10);
    doc.roundedRect(x, kpiTop, kpiAncho, 52, 6).fill(COLOR_FONDO);
    doc.font("Helvetica").fontSize(9).fillColor(COLOR_SUAVE).text(titulo, x + 12, kpiTop + 10);
    doc.font("Helvetica-Bold").fontSize(15).fillColor(COLOR_TEXTO).text(valor, x + 12, kpiTop + 26);
  });
  doc.y = kpiTop + 52;

  if (resumen.totalDevoluciones > 0) {
    doc.font("Helvetica").fontSize(10).fillColor(COLOR_TEXTO).text(
      `Devoluciones (${resumen.notasCredito} nota${resumen.notasCredito === 1 ? "" : "s"} credito): -${cop.format(resumen.totalDevoluciones)}   ·   Total neto: ${cop.format(resumen.totalNeto)}`,
      LEFT,
      kpiTop + 62
    );
    doc.y = kpiTop + 74;
  }

  seccion(doc, TITULO_SERIE[resumen.agrupacion]);
  grafica(doc, resumen.serie, resumen.agrupacion);

  seccion(doc, "Métodos de pago");
  tabla(
    doc,
    [
      { titulo: "Método", ancho: 212 },
      { titulo: "Transacciones", ancho: 100, alinear: "right" },
      { titulo: "Monto", ancho: 120, alinear: "right" },
      { titulo: "%", ancho: 80, alinear: "right" }
    ],
    resumen.metodosPago.map((m) => [m.nombre, String(m.transacciones), cop.format(m.monto), `${m.porcentaje.toFixed(1)}%`])
  );

  seccion(doc, "Productos más vendidos");
  tabla(
    doc,
    [
      { titulo: "Producto", ancho: 292 },
      { titulo: "Cantidad", ancho: 100, alinear: "right" },
      { titulo: "Ingreso", ancho: 120, alinear: "right" }
    ],
    resumen.productosTop.map((p) => [p.nombre, String(p.cantidad), cop.format(p.ingreso)])
  );

  seccion(doc, "Clientes que más compran");
  tabla(
    doc,
    [
      { titulo: "Cliente", ancho: 292 },
      { titulo: "Compras", ancho: 100, alinear: "right" },
      { titulo: "Total", ancho: 120, alinear: "right" }
    ],
    resumen.clientesTop.map((c) => [c.nombre, String(c.compras), cop.format(c.total)])
  );

  doc.end();
  return doc;
}
