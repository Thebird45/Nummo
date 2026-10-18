import express from "express";

const router = express.Router();

router.get("/", (_req, res) => {
  return res.status(200).json({
    message: "Modulo de facturacion electronica inicializado. Integracion DIAN en progreso."
  });
});

export default router;
