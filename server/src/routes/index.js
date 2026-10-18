import express from "express";
import authRoutes from "./auth.js";
import clientesRoutes from "./clientes.js";
import dashboardRoutes from "./dashboard.js";
import facturasRoutes from "./facturas.js";
import inventarioRoutes from "./inventario.js";
import productosRoutes from "./productos.js";
import reportesRoutes from "./reportes.js";
import ventasRoutes from "./ventas.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/productos", productosRoutes);
router.use("/inventario/movimientos", inventarioRoutes);
router.use("/ventas", ventasRoutes);
router.use("/facturas", facturasRoutes);
router.use("/reportes", reportesRoutes);
router.use("/clientes", clientesRoutes);

router.get("/health", (_req, res) => {
  return res.status(200).json({ status: "ok", service: "nummo-api" });
});

export default router;