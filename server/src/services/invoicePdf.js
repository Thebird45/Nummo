import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { env } from "../config/env.js";
import { contenidoQr, datosCufe } from "./dian/cufe.js";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const ESTADOS = {
  pendiente: "Pendiente de validacion DIAN",
  validada: "Validada por la DIAN",
  rechazada: "Rechazada por la DIAN"
};

// QR (modulos dibujados como cuadros) con el CUFE/CUDE al lado
export function dibujarQrDian(doc, { contenido, rotulo, codigo, validado }, x, y) {
  const { modules } = QRCode.create(contenido, { errorCorrectionLevel: "M" });
  const lado = 110;
  const celda = lado / modules.size;
  for (let fila = 0; fila < modules.size; fila += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (modules.get(fila, col)) doc.rect(x + col * celda, y + fila * celda, celda, celda);
    }
  }
  doc.fill("black");

  doc.font("Helvetica-Bold").fontSize(8).fillColor("black").text(`${rotulo}:`, x + lado + 12, y + 4);
  doc.font("Helvetica").fontSize(7).text(codigo, x + lado + 12, y + 16, { width: 300 });
  const estado = validado ? "Validada por la DIAN" : "En validacion DIAN";
  doc.font("Helvetica").fontSize(8).fillColor("gray").text(estado, x + lado + 12, y + 70);
  doc.fillColor("black");
}

// Devuelve el PDF como stream para enviarlo directo en la respuesta
export function buildInvoicePdf(invoice) {
  const { emisor, cliente, venta, items, total, subtotal, impuestos } = invoice.dian_payload;
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });

  doc.fontSize(18).font("Helvetica-Bold").text(emisor.nombre);
  doc.fontSize(10).font("Helvetica")
    .text(`NIT: ${emisor.nit}`)
    .text(emisor.direccion)
    .text(`Tel: ${emisor.telefono}`);

  doc.moveUp(4).fontSize(14).font("Helvetica-Bold")
    .text(`Factura ${invoice.prefijo}-${invoice.numero}`, { align: "right" });
  doc.fontSize(10).font("Helvetica")
    .text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString("es-CO", { timeZone: env.timezone })}`, { align: "right" })
    .text(`Pago: ${venta.metodo_pago}`, { align: "right" })
    .text(ESTADOS[invoice.status] || invoice.status, { align: "right" });

  doc.moveDown(3).font("Helvetica-Bold").text("Cliente");
  doc.font("Helvetica").text(cliente.nombre).text(`Documento: ${cliente.documento}`);
  if (cliente.correo) doc.text(cliente.correo);

  const columns = { nombre: 50, cantidad: 290, iva: 335, precio: 390, subtotal: 480 };
  let y = doc.moveDown(2).y;

  doc.font("Helvetica-Bold")
    .text("Producto", columns.nombre, y)
    .text("Cant.", columns.cantidad, y)
    .text("IVA", columns.iva, y)
    .text("Precio", columns.precio, y)
    .text("Subtotal", columns.subtotal, y);
  y += 18;
  doc.moveTo(50, y - 4).lineTo(560, y - 4).stroke();

  doc.font("Helvetica");
  for (const item of items) {
    const rowHeight = Math.max(18, doc.heightOfString(item.nombre, { width: 230 }) + 6);
    if (y + rowHeight > 680) {
      doc.addPage();
      y = 50;
    }

    doc.text(item.nombre, columns.nombre, y, { width: 230 })
      .text(String(item.cantidad), columns.cantidad, y)
      .text(item.iva_tarifa != null ? `${item.iva_tarifa}%` : "—", columns.iva, y)
      .text(cop.format(item.precio_unitario), columns.precio, y)
      .text(cop.format(item.subtotal), columns.subtotal, y);
    y += rowHeight;
  }

  doc.moveTo(50, y).lineTo(560, y).stroke();
  y += 10;

  // Facturas anteriores al IVA no traen desglose
  if (impuestos) {
    const linea = (label, value) => {
      doc.text(label, 330, y, { width: 130 }).text(value, 460, y, { align: "right", width: 100 });
      y += 15;
    };
    doc.font("Helvetica").fontSize(10);
    linea("Subtotal (sin IVA)", cop.format(subtotal));
    for (const impuesto of impuestos) {
      linea(`IVA ${impuesto.tarifa}% (base ${cop.format(impuesto.base)})`, cop.format(impuesto.iva));
    }
    y += 4;
  }

  doc.font("Helvetica-Bold").fontSize(12)
    .text(`Total: ${cop.format(total)}`, 50, y, { align: "right", width: 510 });
  doc.font("Helvetica").fontSize(8)
    .text("Precios con IVA incluido.", 50, y + 18, { align: "right", width: 510 });

  y += 45;
  if (invoice.cufe) {
    const datos = datosCufe(invoice, { claveTecnica: "", tipoAmbiente: invoice.dian_ambiente || "2", timezone: env.timezone });
    dibujarQrDian(
      doc,
      { contenido: contenidoQr(datos, invoice.cufe), rotulo: "CUFE", codigo: invoice.cufe, validado: invoice.status === "validada" },
      50,
      y
    );
  }
  if (invoice.status === "rechazada") {
    const motivos = invoice.dian_respuesta?.mensajes || [];
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#b91c1c")
      .text("Factura rechazada: sin validez", 50, y)
      .font("Helvetica").fontSize(9);
    motivos.forEach((motivo) => doc.text(`- ${motivo}`));
    doc.fillColor("black");
  }
  const resolucion = invoice.dian_payload.resolucion;
  if (resolucion) {
    const prefijo = resolucion.prefijo ? `prefijo ${resolucion.prefijo}, ` : "";
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(
      `Autorizacion de numeracion de facturacion DIAN No. ${resolucion.numero} del ${resolucion.fecha}, ` +
        `${prefijo}del ${resolucion.desde} al ${resolucion.hasta}, vigente del ${resolucion.vigencia_desde} al ${resolucion.vigencia_hasta}.`,
      50,
      675,
      { align: "center", width: 510 }
    );
  }
  if (invoice.dian_ambiente === "2") {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#b45309")
      .text("Documento generado en ambiente de pruebas: sin validez fiscal.", 50, 700, { align: "center", width: 510 });
  }

  doc.fontSize(8).font("Helvetica").fillColor("gray")
    .text("Documento generado por Nummo.", 50, 720, { align: "center", width: 510 });

  doc.end();
  return doc;
}

// Para adjuntar el PDF a un correo
export function buildInvoicePdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = buildInvoicePdf(invoice);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}
