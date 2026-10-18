import PDFDocument from "pdfkit";
import { env } from "../config/env.js";
import { contenidoQr, datosCufe } from "./dian/cufe.js";
import { dibujarQrDian } from "./invoicePdf.js";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const fecha = (valor) => new Date(valor).toLocaleDateString("es-CO", { timeZone: env.timezone });

export function buildNotaCreditoPdf(nota) {
  const { emisor, cliente, factura_referencia: ref, concepto_texto, motivo, items, subtotal, impuestos, total } =
    nota.dian_payload;
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });

  doc.fontSize(18).font("Helvetica-Bold").text(emisor.nombre);
  doc.fontSize(10).font("Helvetica").text(`NIT: ${emisor.nit}`).text(emisor.direccion).text(`Tel: ${emisor.telefono}`);

  doc.moveUp(4).fontSize(14).font("Helvetica-Bold").text(`Nota credito ${nota.prefijo}-${nota.numero}`, { align: "right" });
  doc.fontSize(10).font("Helvetica")
    .text(`Fecha: ${fecha(nota.created_at)}`, { align: "right" })
    .text(`Factura: ${ref.codigo} del ${fecha(ref.fecha)}`, { align: "right" });

  doc.moveDown(3).font("Helvetica-Bold").text("Cliente", 50);
  doc.font("Helvetica").text(cliente.nombre).text(`Documento: ${cliente.documento}`);

  doc.moveDown().font("Helvetica-Bold").text("Concepto: ", { continued: true }).font("Helvetica").text(concepto_texto);
  doc.font("Helvetica-Bold").text("Motivo: ", { continued: true }).font("Helvetica").text(motivo, { width: 510 });
  doc.fontSize(7).fillColor("gray").text(`CUFE factura: ${ref.cufe}`, { width: 510 }).fillColor("black").fontSize(10);

  const columnas = { nombre: 50, cantidad: 290, iva: 335, precio: 390, subtotal: 480 };
  let y = doc.moveDown(1.5).y;
  doc.font("Helvetica-Bold")
    .text("Producto", columnas.nombre, y)
    .text("Cant.", columnas.cantidad, y)
    .text("IVA", columnas.iva, y)
    .text("Precio", columnas.precio, y)
    .text("Subtotal", columnas.subtotal, y);
  y += 18;
  doc.moveTo(50, y - 4).lineTo(560, y - 4).stroke();

  doc.font("Helvetica");
  for (const item of items) {
    const alto = Math.max(18, doc.heightOfString(item.nombre, { width: 230 }) + 6);
    doc.text(item.nombre, columnas.nombre, y, { width: 230 })
      .text(String(item.cantidad), columnas.cantidad, y)
      .text(`${item.iva_tarifa}%`, columnas.iva, y)
      .text(cop.format(item.precio_unitario), columnas.precio, y)
      .text(cop.format(item.subtotal), columnas.subtotal, y);
    y += alto;
  }
  doc.moveTo(50, y).lineTo(560, y).stroke();
  y += 10;

  const linea = (etiqueta, valor) => {
    doc.text(etiqueta, 330, y, { width: 130 }).text(valor, 460, y, { align: "right", width: 100 });
    y += 15;
  };
  doc.font("Helvetica").fontSize(10);
  linea("Subtotal (sin IVA)", cop.format(subtotal));
  for (const impuesto of impuestos) {
    linea(`IVA ${impuesto.tarifa}% (base ${cop.format(impuesto.base)})`, cop.format(impuesto.iva));
  }
  doc.font("Helvetica-Bold").fontSize(12).text(`Total acreditado: ${cop.format(total)}`, 50, y + 4, { align: "right", width: 510 });
  y += 45;

  if (nota.cude) {
    const datos = datosCufe(nota, { claveTecnica: "", tipoAmbiente: nota.dian_ambiente || "2", timezone: env.timezone });
    dibujarQrDian(
      doc,
      { contenido: contenidoQr(datos, nota.cude, "CUDE"), rotulo: "CUDE", codigo: nota.cude, validado: nota.status === "validada" },
      50,
      y
    );
  }
  if (nota.status === "rechazada") {
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#b91c1c").text("Nota credito rechazada: sin validez", 50, y).font("Helvetica").fontSize(9);
    (nota.dian_respuesta?.mensajes || []).forEach((m) => doc.text(`- ${m}`));
    doc.fillColor("black");
  }
  if (nota.dian_ambiente === "2") {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#b45309")
      .text("Documento generado en ambiente de pruebas: sin validez fiscal.", 50, 700, { align: "center", width: 510 });
  }
  doc.fontSize(8).font("Helvetica").fillColor("gray").text("Documento generado por Nummo.", 50, 720, { align: "center", width: 510 });

  doc.end();
  return doc;
}
