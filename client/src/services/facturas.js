import { api } from "./api";
import { descargarPdf } from "./descargas";

export { mensajeDeError } from "./descargas";

export async function getFacturas() {
  const { data } = await api.get("/facturas");
  return data.facturas;
}

export async function crearFactura(saleId) {
  const { data } = await api.post("/facturas", { sale_id: saleId });
  return data.factura;
}

export async function consultarEstadoFactura(id) {
  const { data } = await api.post(`/facturas/${id}/consultar-estado`);
  return data.factura;
}

export async function enviarFactura(id, correo) {
  const { data } = await api.post(`/facturas/${id}/enviar`, correo ? { correo } : {});
  return data;
}

export async function descargarFacturaPdf(factura) {
  await descargarPdf(`/facturas/${factura.id}/pdf`, `factura-${factura.codigo}.pdf`);
}
