import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getAvailableProductsByBusiness } from "../models/productModel.js";
import { createPosSale, getSalesByBusiness } from "../models/saleModel.js";

const router = express.Router();

const checkoutSchema = z.object({
  customer_name: z.string().max(120).optional().default("Cliente de mostrador"),
  cliente_id: z.number().int().positive().nullable().optional().default(null),
  payment_method: z.enum(["efectivo", "transferencia"]),
  items: z
    .array(
      z.object({
        producto_id: z.string().uuid("producto_id invalido"),
        cantidad: z.coerce.number().int().positive("cantidad invalida")
      })
    )
    .min(1, "Debes agregar al menos un producto")
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const sales = await getSalesByBusiness(req.user.businessId);
    return res.status(200).json({ sales });
  } catch (error) {
    return next(error);
  }
});

router.get("/productos-disponibles", requireAuth, async (req, res, next) => {
  try {
    const products = await getAvailableProductsByBusiness(req.user.businessId);
    return res.status(200).json({ products });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const payload = checkoutSchema.parse(req.body);

    const groupedItems = Object.values(
      payload.items.reduce((acc, item) => {
        if (!acc[item.producto_id]) {
          acc[item.producto_id] = { producto_id: item.producto_id, cantidad: 0 };
        }
        acc[item.producto_id].cantidad += item.cantidad;
        return acc;
      }, {})
    );

    const result = await createPosSale({
      businessId: req.user.businessId,
      sellerId: req.user.sub,
      customerName: payload.customer_name,
      clienteId: payload.cliente_id,
      paymentMethod: payload.payment_method,
      items: groupedItems
    });

    return res.status(201).json({
      message: "Venta registrada correctamente",
      ticket: {
        venta_id: result.sale.id,
        fecha: result.sale.created_at,
        cliente: result.sale.customer_name,
        cliente_id: result.sale.cliente_id,
        metodo_pago: result.sale.payment_method,
        total: result.sale.total,
        items: result.items
      }
    });
  } catch (error) {
    if (error.message === "PRODUCTO_NO_ENCONTRADO") {
      return res.status(404).json({ message: "Uno o mas productos no pertenecen a tu negocio" });
    }

    if (error.message === "STOCK_INSUFICIENTE") {
      return res.status(400).json({ message: "Stock insuficiente para completar la venta" });
    }

    return next(error);
  }
});

export default router;