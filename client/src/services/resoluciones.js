import { api } from "./api";

export async function getResoluciones() {
  const { data } = await api.get("/resoluciones");
  return data;
}

export async function crearResolucion(datos) {
  const { data } = await api.post("/resoluciones", datos);
  return data;
}
