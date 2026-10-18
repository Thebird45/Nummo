import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createInvoiceFromSale,
  getInvoiceById,
  getInvoicesByBusiness,
  updateInvoiceDianStatus
} from "../models/invoiceModel.js";
import { sendInvoiceToDian } from "../services/dianService.js";
import { buildInvoicePdf } from "../services/invoicePdf.js";

const router = express.Router();

const createSchema = z.object({
  sale_id: z.string().uuid("sale_id invalido")
});

const isUuid = (value) => z.string().uuid().safeParse(value).success;

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

    const dian = await sendInvoiceToDian({ invoiceId: invoice.id, payload: invoice.dian_payload });
    const factura = await updateInvoiceDianStatus(invoice.id, {
      status: dian.status,
      providerReference: dian.providerReference
    });

    return res.status(201).json({ message: "Factura generada correctamente", factura });
  } catch (error) {
    if (error.message === "VENTA_NO_ENCONTRADA") {
      return res.status(404).json({ message: "La venta no existe o no pertenece a tu negocio" });
    }

    if (error.message === "VENTA_YA_FACTURADA") {
      return res.status(409).json({ message: "Esta venta ya tiene factura" });
    }

    return next(error);
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

export default router;
