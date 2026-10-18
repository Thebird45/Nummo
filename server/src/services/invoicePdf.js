import PDFDocument from "pdfkit";

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

// Devuelve el PDF como stream para enviarlo directo en la respuesta
export function buildInvoicePdf(invoice) {
  const { emisor, cliente, venta, items, total } = invoice.dian_payload;
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });

  doc.fontSize(18).font("Helvetica-Bold").text(emisor.nombre);
  doc.fontSize(10).font("Helvetica")
    .text(`NIT: ${emisor.nit}`)
    .text(emisor.direccion)
    .text(`Tel: ${emisor.telefono}`);

  doc.moveUp(4).fontSize(14).font("Helvetica-Bold")
    .text(`Factura ${invoice.prefijo}-${invoice.numero}`, { align: "right" });
  doc.fontSize(10).font("Helvetica")
    .text(`Fecha: ${new Date(invoice.created_at).toLocaleDateString("es-CO")}`, { align: "right" })
    .text(`Pago: ${venta.metodo_pago}`, { align: "right" })
    .text(ESTADOS[invoice.status] || invoice.status, { align: "right" });

  doc.moveDown(3).font("Helvetica-Bold").text("Cliente");
  doc.font("Helvetica").text(cliente.nombre).text(`Documento: ${cliente.documento}`);
  if (cliente.correo) doc.text(cliente.correo);

  const columns = { nombre: 50, cantidad: 330, precio: 390, subtotal: 480 };
  let y = doc.moveDown(2).y;

  doc.font("Helvetica-Bold")
    .text("Producto", columns.nombre, y)
    .text("Cant.", columns.cantidad, y)
    .text("Precio", columns.precio, y)
    .text("Subtotal", columns.subtotal, y);
  y += 18;
  doc.moveTo(50, y - 4).lineTo(560, y - 4).stroke();

  doc.font("Helvetica");
  for (const item of items) {
    const rowHeight = Math.max(18, doc.heightOfString(item.nombre, { width: 270 }) + 6);
    if (y + rowHeight > 680) {
      doc.addPage();
      y = 50;
    }

    doc.text(item.nombre, columns.nombre, y, { width: 270 })
      .text(String(item.cantidad), columns.cantidad, y)
      .text(cop.format(item.precio_unitario), columns.precio, y)
      .text(cop.format(item.subtotal), columns.subtotal, y);
    y += rowHeight;
  }

  doc.moveTo(50, y).lineTo(560, y).stroke();
  doc.font("Helvetica-Bold").fontSize(12)
    .text(`Total: ${cop.format(total)}`, 50, y + 10, { align: "right", width: 510 });

  doc.fontSize(8).font("Helvetica").fillColor("gray")
    .text("Documento generado por Nummo.", 50, 720, { align: "center", width: 510 });

  doc.end();
  return doc;
}
