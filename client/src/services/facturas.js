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

export async function reenviarFactura(id) {
  const { data } = await api.post(`/facturas/${id}/reenviar`);
  return data;
}

export async function enviarFactura(id, correo) {
  const { data } = await api.post(`/facturas/${id}/enviar`, correo ? { correo } : {});
  return data;
}

export async function getAcreditable(id) {
  const { data } = await api.get(`/facturas/${id}/acreditable`);
  return data.items;
}

export async function crearNotaCredito(id, datos) {
  const { data } = await api.post(`/facturas/${id}/notas-credito`, datos);
  return data;
}

export async function consultarEstadoNota(id) {
  const { data } = await api.post(`/notas-credito/${id}/consultar-estado`);
  return data.nota;
}

export async function descargarNotaPdf(nota) {
  await descargarPdf(`/notas-credito/${nota.id}/pdf`, `nota-credito-${nota.codigo}.pdf`);
}

export async function descargarFacturaPdf(factura) {
  await descargarPdf(`/facturas/${factura.id}/pdf`, `factura-${factura.codigo}.pdf`);
}
