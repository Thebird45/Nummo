import { api } from "./api";

export async function getPosAvailableProducts() {
  const { data } = await api.get("/ventas/productos-disponibles");
  return data.products;
}

export async function createPosSale(payload) {
  const { data } = await api.post("/ventas", payload);
  return data.ticket;
}

export async function getRecentSales() {
  const { data } = await api.get("/ventas");
  return data.sales;
}
