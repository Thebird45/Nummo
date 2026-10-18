import { pool } from "../db/pool.js";

export async function registerInventoryMovement({
  businessId,
  productoId,
  tipo,
  cantidad,
  motivo
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `
      SELECT id, stock
      FROM productos
      WHERE id = $1
        AND business_id = $2
      FOR UPDATE
      `,
      [productoId, businessId]
    );

    if (productResult.rowCount === 0) {
      throw new Error("PRODUCTO_NO_ENCONTRADO");
    }

    const currentStock = Number(productResult.rows[0].stock);
    const delta = tipo === "entrada" ? cantidad : -cantidad;
    const newStock = currentStock + delta;

    if (newStock < 0) {
      throw new Error("STOCK_NEGATIVO");
    }

    const updateStockResult = await client.query(
      `
      UPDATE productos
      SET stock = $1
      WHERE id = $2
        AND business_id = $3
      RETURNING id, business_id, nombre, descripcion, precio, stock, stock_minimo
      `,
      [newStock, productoId, businessId]
    );

    const movementResult = await client.query(
      `
      INSERT INTO movimientos_inventario (business_id, producto_id, tipo, cantidad, motivo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, business_id, producto_id, tipo, cantidad, motivo, created_at
      `,
      [businessId, productoId, tipo, cantidad, motivo || null]
    );

    await client.query("COMMIT");

    return {
      movimiento: movementResult.rows[0],
      producto: updateStockResult.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getMovimientosByBusiness(businessId) {
  const query = `
    SELECT
      mi.id,
      mi.tipo,
      mi.cantidad,
      mi.motivo,
      mi.created_at,
      p.nombre AS producto
    FROM movimientos_inventario mi
    JOIN productos p ON p.id = mi.producto_id
    WHERE mi.business_id = $1
    ORDER BY mi.created_at DESC
    LIMIT 100
  `;

  const { rows } = await pool.query(query, [businessId]);
  return rows;
}
