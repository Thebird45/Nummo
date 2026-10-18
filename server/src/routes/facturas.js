import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createInvoiceFromSale,
  getInvoiceById,
  getInvoicesByBusiness,
  markInvoiceSent,
  rebuildRejectedInvoice,
  updateInvoiceDianStatus
} from "../models/invoiceModel.js";
import {
  createNotaCredito,
  getItemsAcreditables,
  reintegrarInventario,
  updateNotaDianStatus
} from "../models/notaCreditoModel.js";
import {
  consultarEstadoDian,
  enviarFacturaDian,
  enviarNotaCreditoDian,
  proveedorDian
} from "../services/dianService.js";
import { sendMail } from "../services/emailService.js";
import { buildInvoicePdf, buildInvoicePdfBuffer } from "../services/invoicePdf.js";

const router = express.Router();

const createSchema = z.object({
  sale_id: z.string().uuid("sale_id invalido")
});

const sendSchema = z.object({
  correo: z.string().trim().email("Correo invalido").optional()
});

const notaSchema = z
  .object({
    concepto: z.coerce.number().refine((c) => c === 1 || c === 2, "Concepto invalido (1 devolucion, 2 anulacion)"),
    motivo: z.string().trim().min(5, "Describe el motivo (minimo 5 caracteres)").max(500),
    items: z
      .array(z.object({ producto_id: z.string().uuid(), cantidad: z.coerce.number().int().positive() }))
      .optional(),
    reintegrar_inventario: z.boolean().default(true)
  })
  .refine((n) => n.concepto === 2 || n.items?.length > 0, {
    message: "Indica los productos y cantidades devueltos",
    path: ["items"]
  });

const isUuid = (value) => z.string().uuid().safeParse(value).success;

// Envia al proveedor DIAN y guarda su respuesta
async function emitir(invoice) {
  const dian = await enviarFacturaDian(invoice);
  const factura = await updateInvoiceDianStatus(invoice.id, {
    status: dian.status,
    provider: proveedorDian().nombre,
    providerReference: dian.trackId,
    cufe: dian.cufe,
    ambiente: proveedorDian().tipoAmbiente,
    respuesta: dian.respuesta
  });
  const message =
    factura.status === "rechazada"
      ? `Factura rechazada: ${dian.respuesta.mensajes.join("; ")}`
      : "Factura generada correctamente";
  return { message, factura };
}

// Errores de numeracion compartidos por crear y reenviar
function respuestaNumeracion(res, error) {
  if (error.message === "SIN_RESOLUCION") {
    return res.status(409).json({
      message: "Configura la resolucion de facturacion de la DIAN antes de facturar (Configuracion)"
    });
  }
  if (error.message === "RESOLUCION_NO_VIGENTE") {
    return res.status(409).json({ message: "La resolucion de facturacion no esta vigente; registra una nueva" });
  }
  if (error.message === "RANGO_AGOTADO") {
    return res.status(409).json({ message: "Se agoto el rango de numeracion autorizado; registra una nueva resolucion" });
  }
  return null;
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const facturas = await getInvoicesByBusiness(req.user.businessId);
    return res.status(200).json({ facturas });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);

    const invoice = await createInvoiceFromSale({
      businessId: req.user.businessId,
      saleId: payload.sale_id
    });

    return res.status(201).json(await emitir(invoice));
  } catch (error) {
    if (error.message === "VENTA_NO_ENCONTRADA") {
      return res.status(404).json({ message: "La venta no existe o no pertenece a tu negocio" });
    }

    if (error.message === "VENTA_YA_FACTURADA") {
      return res.status(409).json({ message: "Esta venta ya tiene factura" });
    }

    return respuestaNumeracion(res, error) || next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const factura = isUuid(req.params.id)
      ? await getInvoiceById(req.params.id, req.user.businessId)
      : null;
    if (!factura) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    return res.status(200).json({ factura });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/reenviar", requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    const invoice = await rebuildRejectedInvoice({ businessId: req.user.businessId, invoiceId: req.params.id });
    const { factura } = await emitir(invoice);
    const message =
      factura.status === "rechazada"
        ? `Sigue rechazada: ${factura.dian_respuesta.mensajes.join("; ")}`
        : "Factura corregida y reenviada a la DIAN";
    return res.status(200).json({ message, factura });
  } catch (error) {
    if (error.message === "FACTURA_NO_ENCONTRADA") {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    if (error.message === "FACTURA_NO_RECHAZADA") {
      return res.status(409).json({ message: "Solo se pueden reenviar facturas rechazadas" });
    }
    return respuestaNumeracion(res, error) || next(error);
  }
});

router.get("/:id/acreditable", requireAuth, async (req, res, next) => {
  try {
    const factura = isUuid(req.params.id) ? await getInvoiceById(req.params.id, req.user.businessId) : null;
    if (!factura) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    return res.status(200).json({ items: await getItemsAcreditables(factura.id) });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/notas-credito", requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    const datos = notaSchema.parse(req.body);
    const creada = await createNotaCredito({
      businessId: req.user.businessId,
      invoiceId: req.params.id,
      concepto: datos.concepto,
      motivo: datos.motivo,
      items: datos.items || [],
      reintegrarInventario: datos.reintegrar_inventario
    });

    const dian = await enviarNotaCreditoDian(creada);
    const nota = await updateNotaDianStatus(creada.id, {
      status: dian.status,
      provider: proveedorDian().nombre,
      providerReference: dian.trackId,
      cude: dian.cude,
      ambiente: proveedorDian().tipoAmbiente,
      respuesta: dian.respuesta
    });

    if (nota.status !== "rechazada" && nota.reintegrar_inventario) {
      await reintegrarInventario(nota, req.user.businessId);
    }

    const codigo = `${nota.prefijo}-${nota.numero}`;
    const message =
      nota.status === "rechazada"
        ? `Nota credito ${codigo} rechazada: ${dian.respuesta.mensajes.join("; ")}`
        : `Nota credito ${codigo} generada`;
    return res.status(201).json({ message, nota });
  } catch (error) {
    if (error.message === "FACTURA_NO_ENCONTRADA") {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    if (error.message === "FACTURA_NO_VALIDADA") {
      return res.status(409).json({ message: "Solo se pueden hacer notas credito a facturas validadas por la DIAN" });
    }
    if (error.message === "CANTIDAD_INVALIDA") {
      return res.status(400).json({ message: "La cantidad supera lo que queda por acreditar de ese producto" });
    }
    if (error.message === "NADA_POR_ACREDITAR") {
      return res.status(409).json({ message: "La factura ya fue acreditada por completo" });
    }
    return next(error);
  }
});

router.post("/:id/consultar-estado", requireAuth, async (req, res, next) => {
  try {
    const factura = isUuid(req.params.id)
      ? await getInvoiceById(req.params.id, req.user.businessId)
      : null;
    if (!factura) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    const dian = await consultarEstadoDian(factura);
    const actualizada =
      dian.status === factura.status
        ? factura
        : await updateInvoiceDianStatus(factura.id, { status: dian.status, respuesta: dian.respuesta });

    return res.status(200).json({ factura: actualizada });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/pdf", requireAuth, async (req, res, next) => {
  try {
    const factura = isUuid(req.params.id)
      ? await getInvoiceById(req.params.id, req.user.businessId)
      : null;
    if (!factura) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    // Facturas anteriores al modulo no guardaron los datos de la venta
    if (!factura.dian_payload) {
      return res.status(409).json({ message: "Esta factura no tiene datos para generar el PDF" });
    }

    const filename = `factura-${factura.prefijo}-${factura.numero}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return buildInvoicePdf(factura).pipe(res);
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/enviar", requireAuth, async (req, res, next) => {
  try {
    const payload = sendSchema.parse(req.body);
    const factura = isUuid(req.params.id)
      ? await getInvoiceById(req.params.id, req.user.businessId)
      : null;
    if (!factura) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    if (!factura.dian_payload) {
      return res.status(409).json({ message: "Esta factura no tiene datos para generar el PDF" });
    }

    if (factura.status === "rechazada") {
      return res.status(409).json({ message: "No se puede enviar una factura rechazada por la DIAN" });
    }

    const correo = payload.correo || factura.customer_email;
    if (!correo) {
      return res.status(400).json({ message: "La factura no tiene correo; indica a donde enviarla" });
    }

    const codigo = `${factura.prefijo}-${factura.numero}`;
    const { emisor, cliente } = factura.dian_payload;
    const pdf = await buildInvoicePdfBuffer(factura);

    let simulado;
    try {
      ({ simulado } = await sendMail({
        to: correo,
        subject: `Factura ${codigo} de ${emisor.nombre}`,
        text: `Hola ${cliente.nombre},\n\nAdjuntamos la factura ${codigo} de ${emisor.nombre}.\n\nGracias por tu compra.`,
        attachments: [{ filename: `factura-${codigo}.pdf`, content: pdf, contentType: "application/pdf" }]
      }));
    } catch (mailError) {
      console.error(mailError);
      return res.status(502).json({ message: "No se pudo enviar el correo. Revisa la configuracion SMTP" });
    }

    const envio = await markInvoiceSent(factura.id, correo);

    return res.status(200).json({
      message: simulado ? `Envio simulado a ${correo} (configura SMTP para enviar de verdad)` : `Factura enviada a ${correo}`,
      simulado,
      ...envio
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
