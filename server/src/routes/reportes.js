import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getSalesByDateRange } from "../models/saleModel.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { inicio, fin } = req.query;

    const start = inicio ? new Date(inicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = fin ? new Date(fin) : new Date();

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Parámetros de fecha inválidos" });
    }

    const ventas = await getSalesByDateRange(req.user.businessId, start, end);
    return res.status(200).json({ ventas });
  } catch (error) {
    return next(error);
  }
});

export default router;
