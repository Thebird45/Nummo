import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import clienteModel from "../models/clienteModel.js";
import { errorNit } from "../services/dian/nit.js";

const router = express.Router();

// Helper: soporta businessId (camelCase) y business_id (snake_case) por compatibilidad
function getBusinessId(user) {
  const id = user?.businessId ?? user?.business_id ?? null;
  return id;
}

// GET /api/clientes
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const businessId = getBusinessId(req.user);
    if (!businessId) {
      return res.status(401).json({ error: "Business ID no encontrado en token" });
    }
    const clientes = await clienteModel.getAll(businessId);
    res.json(clientes);
  } catch (err) {
    next(err);
  }
});

// GET /api/clientes/:id
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const businessId = getBusinessId(req.user);
    if (!businessId) {
      return res.status(401).json({ error: "Business ID no encontrado en token" });
    }
    const cliente = await clienteModel.getById(req.params.id, businessId);
    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

// GET /api/clientes/:id/historial
// IMPORTANTE: esta ruta debe ir ANTES de /:id para que Express no confunda
// "historial" como un :id
router.get("/:id/historial", requireAuth, async (req, res, next) => {
  try {
    const businessId = getBusinessId(req.user);
    if (!businessId) {
      return res.status(401).json({ error: "Business ID no encontrado en token" });
    }
    const historial = await clienteModel.getHistorial(req.params.id, businessId);
    res.json(historial);
  } catch (err) {
    next(err);
  }
});

// POST /api/clientes
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const businessId = getBusinessId(req.user);
    if (!businessId) {
      return res.status(401).json({ error: "Business ID no encontrado en token" });
    }
    const { nombre, documento, telefono, correo, direccion } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    if (documento?.trim() && errorNit(documento)) {
      return res.status(400).json({ error: errorNit(documento) });
    }
    const nuevo = await clienteModel.create({
      business_id: businessId,
      nombre,
      documento,
      telefono,
      correo,
      direccion
    });
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/clientes/:id
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const businessId = getBusinessId(req.user);
    if (!businessId) {
      return res.status(401).json({ error: "Business ID no encontrado en token" });
    }
    const { nombre, documento, telefono, correo, direccion } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    if (documento?.trim() && errorNit(documento)) {
      return res.status(400).json({ error: errorNit(documento) });
    }
    const actualizado = await clienteModel.update(
      req.params.id,
      businessId,
      { nombre, documento, telefono, correo, direccion }
    );
    if (!actualizado) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clientes/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const businessId = getBusinessId(req.user);
    if (!businessId) {
      return res.status(401).json({ error: "Business ID no encontrado en token" });
    }
    const ok = await clienteModel.delete(req.params.id, businessId);
    if (!ok) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    res.json({ message: "Cliente eliminado" });
  } catch (err) {
    next(err);
  }
});

export default router;