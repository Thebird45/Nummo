import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getInvoicesToday,
  getLowStockProducts,
  getTodaySummary,
  getWeeklySales
} from "../models/dashboardModel.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const businessId = req.user.businessId;

    const [summary, invoicesToday, lowStock, weeklySales] = await Promise.all([
      getTodaySummary(businessId),
      getInvoicesToday(businessId),
      getLowStockProducts(businessId),
      getWeeklySales(businessId)
    ]);

    return res.status(200).json({
      summary: {
        ventasHoy: summary.ventas_hoy,
        ingresosHoy: summary.ingresos_hoy,
        facturasHoy: invoicesToday
      },
      lowStock,
      weeklySales
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
