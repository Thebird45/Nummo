import { pool } from "../db/pool.js";

export async function createPosSale({
  businessId,
  sellerId,
  customerName,
  clienteId,
  paymentMethod,
  items
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productIds = items.map((item) => item.producto_id);
    const productsResult = await client.query(
      `
      SELECT id, nombre, precio, stock, iva_tarifa
      FROM productos
      WHERE business_id = $1
        AND id = ANY($2::uuid[])
      FOR UPDATE
      `,
      [businessId, productIds]
    );

    const productMap = new Map(productsResult.rows.map((row) => [row.id, row]));

    const saleItems = items.map((item) => {
      const product = productMap.get(item.producto_id);
      if (!product) {
        throw new Error("PRODUCTO_NO_ENCONTRADO");
      }

      const currentStock = Number(product.stock);
      if (currentStock < item.cantidad) {
        throw new Error("STOCK_INSUFICIENTE");
      }

      const unitPrice = Number(product.precio);
      const subtotal = unitPrice * item.cantidad;

      return {
        producto_id: item.producto_id,
        nombre: product.nombre,
        cantidad: item.cantidad,
        unit_price: unitPrice,
        iva_tarifa: Number(product.iva_tarifa),
        subtotal,
        stock_final: currentStock - item.cantidad
      };
    });

    const total = saleItems.reduce((sum, item) => sum + item.subtotal, 0);

    const saleResult = await client.query(
      `
      INSERT INTO sales (business_id, seller_id, customer_name, cliente_id, payment_method, total)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, business_id, seller_id, customer_name, cliente_id, payment_method, total, created_at
      `,
      [businessId, sellerId, customerName, clienteId || null, paymentMethod, total]
    );

    const sale = saleResult.rows[0];

    for (const item of saleItems) {
      await client.query(
        `
        INSERT INTO sale_items (sale_id, producto_id, quantity, unit_price, subtotal, iva_tarifa)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [sale.id, item.producto_id, item.cantidad, item.unit_price, item.subtotal, item.iva_tarifa]
      );

      await client.query(
        `
        UPDATE productos
        SET stock = $1
        WHERE id = $2
          AND business_id = $3
        `,
        [item.stock_final, item.producto_id, businessId]
      );

      await client.query(
        `
        INSERT INTO movimientos_inventario (business_id, producto_id, tipo, cantidad, motivo)
        VALUES ($1, $2, 'salida', $3, $4)
        `,
        [businessId, item.producto_id, item.cantidad, `Venta POS ${sale.id}`]
      );
    }

    await client.query("COMMIT");

    return {
      sale,
      items: saleItems
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getSalesByBusiness(businessId) {
  const query = `
    SELECT
      s.id, s.customer_name, s.cliente_id, s.payment_method, s.total, s.created_at,
      c.nombre AS cliente_nombre,
      i.id AS factura_id,
      i.prefijo || '-' || i.numero AS factura_codigo
    FROM sales s
    LEFT JOIN clientes c ON c.id = s.cliente_id
    LEFT JOIN invoices i ON i.sale_id = s.id
    WHERE s.business_id = $1
    ORDER BY s.created_at DESC
    LIMIT 20
  `;

  const { rows } = await pool.query(query, [businessId]);
  return rows;
}

export async function getSalesByDateRange(businessId, inicio, fin) {
  const query = `
    SELECT
      s.id,
      s.customer_name,
      s.cliente_id,
      c.nombre AS cliente_nombre,
      s.payment_method,
      s.total,
      s.created_at AS fecha,
      json_agg(
        json_build_object(
          'nombre', p.nombre,
          'cantidad', si.quantity,
          'subtotal', si.subtotal
        ) ORDER BY p.nombre
      ) AS items
    FROM sales s
    LEFT JOIN clientes c ON c.id = s.cliente_id
    JOIN sale_items si ON si.sale_id = s.id
    JOIN productos p ON p.id = si.producto_id
    WHERE s.business_id = $1
      AND s.created_at >= $2::timestamptz
      AND s.created_at <= $3::timestamptz
    GROUP BY s.id, c.nombre
    ORDER BY s.created_at DESC
  `;

  const { rows } = await pool.query(query, [businessId, inicio, fin]);
  return rows;
}