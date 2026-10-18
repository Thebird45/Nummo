import { api } from "./api";

export async function getFacturas() {
  const { data } = await api.get("/facturas");
  return data.facturas;
}

export async function crearFactura(saleId) {
  const { data } = await api.post("/facturas", { sale_id: saleId });
  return data.factura;
}

// El PDF requiere el token, por eso se descarga con axios y no con un <a href>
export async function descargarFacturaPdf(factura) {
  const { data } = await api.get(`/facturas/${factura.id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `factura-${factura.codigo}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

// Con responseType blob el mensaje de error del backend llega como Blob
export async function mensajeDeError(error, fallback) {
  const body = error.response?.data;
  if (body instanceof Blob) {
    try {
      return JSON.parse(await body.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return body?.message || fallback;
}
