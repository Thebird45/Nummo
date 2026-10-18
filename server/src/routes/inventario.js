import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getMovimientosByBusiness, registerInventoryMovement } from "../models/inventoryModel.js";

const router = express.Router();

const movementSchema = z.object({
  producto_id: z.string().uuid("producto_id invalido"),
  tipo: z.enum(["entrada", "salida"]),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  motivo: z.string().max(180, "El motivo no puede superar 180 caracteres").optional().default("")
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const movimientos = await getMovimientosByBusiness(req.user.businessId);
    return res.status(200).json({ movimientos });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const payload = movementSchema.parse(req.body);
    const result = await registerInventoryMovement({
      businessId: req.user.businessId,
      productoId: payload.producto_id,
      tipo: payload.tipo,
      cantidad: payload.cantidad,
      motivo: payload.motivo
    });

    return res.status(201).json({
      message: "Movimiento registrado",
      ...result
    });
  } catch (error) {
    if (error.message === "PRODUCTO_NO_ENCONTRADO") {
      return res.status(404).json({ message: "Producto no encontrado para este negocio" });
    }

    if (error.message === "STOCK_NEGATIVO") {
      return res.status(400).json({ message: "Stock insuficiente para registrar salida" });
    }

    return next(error);
  }
});

export default router;
