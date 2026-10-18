import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getNotaById, updateNotaDianStatus } from "../models/notaCreditoModel.js";
import { consultarEstadoDian } from "../services/dianService.js";
import { buildNotaCreditoPdf } from "../services/notaCreditoPdf.js";

const router = express.Router();

const isUuid = (value) => z.string().uuid().safeParse(value).success;

async function buscarNota(req) {
  return isUuid(req.params.id) ? getNotaById(req.params.id, req.user.businessId) : null;
}

router.post("/:id/consultar-estado", requireAuth, async (req, res, next) => {
  try {
    const nota = await buscarNota(req);
    if (!nota) {
      return res.status(404).json({ message: "Nota credito no encontrada" });
    }
    const dian = await consultarEstadoDian(nota);
    const actualizada =
      dian.status === nota.status ? nota : await updateNotaDianStatus(nota.id, { status: dian.status, respuesta: dian.respuesta });
    return res.status(200).json({ nota: actualizada });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/pdf", requireAuth, async (req, res, next) => {
  try {
    const nota = await buscarNota(req);
    if (!nota) {
      return res.status(404).json({ message: "Nota credito no encontrada" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="nota-credito-${nota.prefijo}-${nota.numero}.pdf"`);
    return buildNotaCreditoPdf(nota).pipe(res);
  } catch (error) {
    return next(error);
  }
});

export default router;
