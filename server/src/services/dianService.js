import { env } from "../config/env.js";

// Servicio base para integrar proveedor tecnologico (Plemsi/Aliaddo).
// Actualmente es un stub para facilitar pruebas del flujo en desarrollo.
export async function sendInvoiceToDian({ invoiceId, payload }) {
  if (!env.plemsiApiUrl || !env.plemsiApiKey) {
    return {
      invoiceId,
      status: "pendiente",
      providerReference: null,
      message: "Configura PLEMSI_API_URL y PLEMSI_API_KEY para habilitar DIAN"
    };
  }

  // Aqui iria un fetch/axios real al proveedor autorizado.
  return {
    invoiceId,
    status: "pendiente",
    providerReference: `SIM-${Date.now()}`,
    message: "Factura enviada al proveedor DIAN en modo simulado"
  };
}
