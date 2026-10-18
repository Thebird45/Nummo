import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createProduct,
  deleteProduct,
  getAvailableProductsByBusiness,
  getLowStockProductsByBusiness,
  getProductsByBusiness,
  updateProduct
} from "../models/productModel.js";

const router = express.Router();

const createProductSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio").max(120),
  descripcion: z.string().max(400).optional().default(""),
  precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo").default(0),
  stock_minimo: z.coerce.number().int().min(0, "El stock minimo no puede ser negativo").default(0)
});

const updateProductSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio").max(120),
  descripcion: z.string().max(400).optional().default(""),
  precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo"),
  stock_minimo: z.coerce.number().int().min(0, "El stock minimo no puede ser negativo")
});

const idSchema = z.object({
  id: z.string().uuid("ID de producto invalido")
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const products = await getProductsByBusiness(req.user.businessId);
    return res.status(200).json({ products });
  } catch (error) {
    return next(error);
  }
});

router.get("/bajo-stock", requireAuth, async (req, res, next) => {
  try {
    const products = await getLowStockProductsByBusiness(req.user.businessId);
    return res.status(200).json({ products });
  } catch (error) {
    return next(error);
  }
});

router.get("/disponibles", requireAuth, async (req, res, next) => {
  try {
    const products = await getAvailableProductsByBusiness(req.user.businessId);
    return res.status(200).json({ products });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const payload = createProductSchema.parse(req.body);
    const product = await createProduct({
      businessId: req.user.businessId,
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      precio: payload.precio,
      stock: payload.stock,
      stockMinimo: payload.stock_minimo
    });

    return res.status(201).json({
      message: "Producto creado",
      product
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = updateProductSchema.parse(req.body);
    const updated = await updateProduct({
      businessId: req.user.businessId,
      productId: id,
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      precio: payload.precio,
      stock: payload.stock,
      stockMinimo: payload.stock_minimo
    });

    if (!updated) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json({
      message: "Producto actualizado",
      product: updated
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = idSchema.parse(req.params);
    const deleted = await deleteProduct({
      businessId: req.user.businessId,
      productId: id
    });

    if (!deleted) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json({ message: "Producto eliminado" });
  } catch (error) {
    return next(error);
  }
});

export default router;
