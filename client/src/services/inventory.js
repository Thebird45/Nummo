import { api } from "./api";

export async function getProducts() {
  const { data } = await api.get("/productos");
  return data.products;
}

export async function createProduct(payload) {
  const { data } = await api.post("/productos", payload);
  return data.product;
}

export async function updateProduct(id, payload) {
  const { data } = await api.put(`/productos/${id}`, payload);
  return data.product;
}

export async function deleteProduct(id) {
  await api.delete(`/productos/${id}`);
}

export async function registerMovement(payload) {
  const { data } = await api.post("/inventario/movimientos", payload);
  return data;
}

export async function getMovimientos() {
  const { data } = await api.get("/inventario/movimientos");
  return data.movimientos;
}

export async function getAvailableProducts() {
  const { data } = await api.get("/productos/disponibles");
  return data.products;
}
