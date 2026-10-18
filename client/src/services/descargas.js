import { api } from "./api";

// El PDF requiere el token, por eso se descarga con axios y no con un <a href>
export async function descargarPdf(path, nombre, params) {
  const { data } = await api.get(path, { responseType: "blob", params });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
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
