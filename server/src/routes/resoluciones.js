import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  crearResolucion,
  getHistorialResoluciones,
  getResolucionActiva
} from "../models/resolucionModel.js";
import { alertasResolucion } from "../services/resolucionAlertas.js";

const router = express.Router();

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida (AAAA-MM-DD)");

const resolucionSchema = z
  .object({
    numero_resolucion: z.string().trim().regex(/^\d{1,30}$/, "El numero de resolucion debe tener solo digitos"),
    fecha_resolucion: fecha,
    prefijo: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{0,4}$/, "El prefijo tiene maximo 4 letras o numeros")
      .default(""),
    rango_desde: z.coerce.number().int().positive("El rango debe empezar en 1 o mas"),
    rango_hasta: z.coerce.number().int().positive(),
    vigencia_desde: fecha,
    vigencia_hasta: fecha,
    clave_tecnica: z.string().trim().max(100).optional()
  })
  .refine((r) => r.rango_hasta >= r.rango_desde, {
    message: "El rango final debe ser mayor o igual al inicial",
    path: ["rango_hasta"]
  })
  .refine((r) => r.vigencia_hasta >= r.vigencia_desde, {
    message: "La vigencia final debe ser posterior a la inicial",
    path: ["vigencia_hasta"]
  });

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const [activa, historial] = await Promise.all([
      getResolucionActiva(req.user.businessId),
      getHistorialResoluciones(req.user.businessId)
    ]);
    return res.status(200).json({ activa, alertas: alertasResolucion(activa), historial });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requireRole("dueno"), async (req, res, next) => {
  try {
    const datos = resolucionSchema.parse(req.body);
    await crearResolucion(req.user.businessId, datos);
    const activa = await getResolucionActiva(req.user.businessId);
    return res.status(201).json({
      message: "Resolucion registrada",
      activa,
      alertas: alertasResolucion(activa)
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
