import { pool } from "../db/pool.js";

// Fechas como texto "YYYY-MM-DD" para no correrlas con la zona horaria
const CAMPOS = `
  r.id, r.numero_resolucion, to_char(r.fecha_resolucion, 'YYYY-MM-DD') AS fecha_resolucion,
  r.prefijo, r.rango_desde, r.rango_hasta,
  to_char(r.vigencia_desde, 'YYYY-MM-DD') AS vigencia_desde,
  to_char(r.vigencia_hasta, 'YYYY-MM-DD') AS vigencia_hasta,
  r.clave_tecnica IS NOT NULL AS tiene_clave_tecnica, r.activa, r.created_at
`;

export async function getResolucionActiva(businessId) {
  const query = `
    SELECT
      ${CAMPOS},
      GREATEST(
        COALESCE((SELECT MAX(i.numero) FROM invoices i WHERE i.business_id = r.business_id AND i.prefijo = r.prefijo), 0) + 1,
        r.rango_desde
      ) AS siguiente,
      (SELECT COUNT(*) FROM invoices i WHERE i.resolucion_id = r.id)::int AS emitidas,
      (r.vigencia_hasta - CURRENT_DATE)::int AS dias_para_vencer,
      CURRENT_DATE BETWEEN r.vigencia_desde AND r.vigencia_hasta AS vigente
    FROM resoluciones_facturacion r
    WHERE r.business_id = $1
      AND r.activa
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [businessId]);
  const r = rows[0];
  if (!r) return null;

  const siguiente = Number(r.siguiente);
  const total = Number(r.rango_hasta) - Number(r.rango_desde) + 1;
  return {
    ...r,
    rango_desde: Number(r.rango_desde),
    rango_hasta: Number(r.rango_hasta),
    siguiente,
    disponibles: Math.max(Number(r.rango_hasta) - siguiente + 1, 0),
    total
  };
}

export async function getHistorialResoluciones(businessId) {
  const query = `
    SELECT ${CAMPOS}
    FROM resoluciones_facturacion r
    WHERE r.business_id = $1
    ORDER BY r.created_at DESC
  `;
  const { rows } = await pool.query(query, [businessId]);
  return rows.map((r) => ({ ...r, rango_desde: Number(r.rango_desde), rango_hasta: Number(r.rango_hasta) }));
}

// La nueva resolucion reemplaza a la activa (las anteriores quedan como historial)
export async function crearResolucion(businessId, datos) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE resoluciones_facturacion SET activa = FALSE WHERE business_id = $1 AND activa",
      [businessId]
    );
    const { rows } = await client.query(
      `
      INSERT INTO resoluciones_facturacion
        (business_id, numero_resolucion, fecha_resolucion, prefijo, rango_desde, rango_hasta,
         vigencia_desde, vigencia_hasta, clave_tecnica)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
      `,
      [
        businessId,
        datos.numero_resolucion,
        datos.fecha_resolucion,
        datos.prefijo,
        datos.rango_desde,
        datos.rango_hasta,
        datos.vigencia_desde,
        datos.vigencia_hasta,
        datos.clave_tecnica || null
      ]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
