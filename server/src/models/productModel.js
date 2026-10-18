import { pool } from "../db/pool.js";

export async function createProduct({
  businessId,
  nombre,
  descripcion,
  precio,
  stock,
  stockMinimo,
  ivaTarifa
}) {
  const query = `
    INSERT INTO productos (business_id, nombre, descripcion, precio, stock, stock_minimo, iva_tarifa)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, business_id, nombre, descripcion, precio, stock, stock_minimo, iva_tarifa, created_at
  `;

  const { rows } = await pool.query(query, [
    businessId,
    nombre,
    descripcion,
    precio,
    stock,
    stockMinimo,
    ivaTarifa
  ]);

  return rows[0];
}

export async function getProductsByBusiness(businessId) {
  const query = `
    SELECT id, business_id, nombre, descripcion, precio, stock, stock_minimo, iva_tarifa, created_at
    FROM productos
    WHERE business_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query, [businessId]);
  return rows;
}

export async function updateProduct({
  businessId,
  productId,
  nombre,
  descripcion,
  precio,
  stock,
  stockMinimo,
  ivaTarifa
}) {
  const query = `
    UPDATE productos
    SET
      nombre = $1,
      descripcion = $2,
      precio = $3,
      stock = $4,
      stock_minimo = $5,
      iva_tarifa = COALESCE($8, iva_tarifa)
    WHERE id = $6
      AND business_id = $7
    RETURNING id, business_id, nombre, descripcion, precio, stock, stock_minimo, iva_tarifa, created_at
  `;

  const { rows } = await pool.query(query, [
    nombre,
    descripcion,
    precio,
    stock,
    stockMinimo,
    productId,
    businessId,
    ivaTarifa ?? null
  ]);

  return rows[0] || null;
}

export async function deleteProduct({ businessId, productId }) {
  const query = `
    DELETE FROM productos
    WHERE id = $1
      AND business_id = $2
    RETURNING id
  `;

  const { rows } = await pool.query(query, [productId, businessId]);
  return rows[0] || null;
}

export async function getLowStockProductsByBusiness(businessId) {
  const query = `
    SELECT id, business_id, nombre, descripcion, precio, stock, stock_minimo, iva_tarifa, created_at
    FROM productos
    WHERE business_id = $1
      AND stock < stock_minimo
    ORDER BY stock ASC
  `;

  const { rows } = await pool.query(query, [businessId]);
  return rows;
}

export async function getAvailableProductsByBusiness(businessId) {
  const query = `
    SELECT id, nombre, descripcion, precio, stock, iva_tarifa
    FROM productos
    WHERE business_id = $1
      AND stock > 0
    ORDER BY nombre ASC
  `;

  const { rows } = await pool.query(query, [businessId]);
  return rows;
}

export async function getProductByIdAndBusiness({ businessId, productId }) {
  const query = `
    SELECT id, business_id, nombre, descripcion, precio, stock, stock_minimo, iva_tarifa
    FROM productos
    WHERE id = $1
      AND business_id = $2
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [productId, businessId]);
  return rows[0] || null;
}
