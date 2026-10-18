import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { env } from "../config/env.js";
import { getBusinessById } from "../models/businessModel.js";
import { getNotasByDateRange } from "../models/notaCreditoModel.js";
import { getSalesByDateRange } from "../models/saleModel.js";
import { buildReportPdf } from "../services/reportPdf.js";
import { resumirVentas } from "../services/reportSummary.js";

const router = express.Router();

function rangoDesdeQuery({ inicio, fin }) {
  const start = inicio ? new Date(inicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = fin ? new Date(fin) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }
  return { start, end };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const rango = rangoDesdeQuery(req.query);
    if (!rango) {
      return res.status(400).json({ message: "Parámetros de fecha inválidos" });
    }
    const { start, end } = rango;

    const [ventas, notasCredito] = await Promise.all([
      getSalesByDateRange(req.user.businessId, start, end),
      getNotasByDateRange(req.user.businessId, start, end)
    ]);
    return res.status(200).json({ ventas, notas_credito: notasCredito });
  } catch (error) {
    return next(error);
  }
});

router.get("/pdf", requireAuth, async (req, res, next) => {
  try {
    const rango = rangoDesdeQuery(req.query);
    if (!rango) {
      return res.status(400).json({ message: "Parámetros de fecha inválidos" });
    }
    const { start, end } = rango;

    const [negocio, ventas, notas] = await Promise.all([
      getBusinessById(req.user.businessId),
      getSalesByDateRange(req.user.businessId, start, end),
      getNotasByDateRange(req.user.businessId, start, end)
    ]);
    if (!negocio) {
      return res.status(404).json({ message: "Negocio no encontrado" });
    }

    const resumen = resumirVentas(ventas, { inicio: start, fin: end, timezone: env.timezone, notas });
    const dia = (fecha) => new Intl.DateTimeFormat("en-CA", { timeZone: env.timezone }).format(fecha);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-ventas-${dia(start)}_${dia(end)}.pdf"`);
    return buildReportPdf({ negocio, inicio: start, fin: end, resumen }).pipe(res);
  } catch (error) {
    return next(error);
  }
});

export default router;
