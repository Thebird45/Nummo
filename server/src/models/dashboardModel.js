import { pool } from "../db/pool.js";

export async function getTodaySummary(businessId) {
  const query = `
    SELECT
      COUNT(*)::int AS ventas_hoy,
      COALESCE(SUM(total), 0)::float AS ingresos_hoy
    FROM sales
    WHERE business_id = $1
      AND created_at::date = CURRENT_DATE
  `;
  const { rows } = await pool.query(query, [businessId]);
  return rows[0];
}

export async function getInvoicesToday(businessId) {
  const query = `
    SELECT COUNT(*)::int AS facturas_hoy
    FROM invoices
    WHERE business_id = $1
      AND created_at::date = CURRENT_DATE
  `;
  const { rows } = await pool.query(query, [businessId]);
  return rows[0]?.facturas_hoy || 0;
}

export async function getLowStockProducts(businessId) {
  const query = `
    SELECT
      id,
      nombre AS name,
      stock AS quantity,
      stock_minimo AS min_stock,
      descripcion AS category
    FROM productos
    WHERE business_id = $1
      AND stock < stock_minimo
    ORDER BY stock ASC
    LIMIT 8
  `;

  const { rows } = await pool.query(query, [businessId]);
  return rows;
}

export async function getWeeklySales(businessId) {
  const query = `
    SELECT
      TO_CHAR(day, 'Dy') AS dia,
      COALESCE(SUM(s.total), 0)::float AS total
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS day
    LEFT JOIN sales s
      ON s.business_id = $1
      AND s.created_at::date = day::date
    GROUP BY day
    ORDER BY day ASC
  `;

  const { rows } = await pool.query(query, [businessId]);
  return rows;
}
