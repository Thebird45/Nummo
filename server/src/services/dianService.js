import { env } from "../config/env.js";
import { proveedorSimulado } from "./dian/simulado.js";

// Cada proveedor (simulado, plemsi...) expone enviar(factura) y consultar(factura)
const PROVEEDORES = { simulado: proveedorSimulado };

function proveedor() {
  const elegido = PROVEEDORES[env.dian.provider];
  if (!elegido) {
    throw new Error(`Proveedor DIAN no soportado: ${env.dian.provider}`);
  }
  return elegido;
}

export function proveedorDian() {
  return proveedor();
}

export async function enviarFacturaDian(factura) {
  return proveedor().enviar(factura);
}

export async function enviarNotaCreditoDian(nota) {
  return proveedor().enviarNotaCredito(nota);
}

export async function consultarEstadoDian(factura) {
  return proveedor().consultar(factura);
}
