import { pool } from "../db/pool.js";
import { desglosarIva } from "../services/iva.js";

const PREFIJO = "NC";

// Conceptos de correccion de la DIAN para notas credito
export const CONCEPTOS = {
  1: "Devolucion parcial de los bienes",
  2: "Anulacion de factura electronica"
};

const CAMPOS = `
  id, invoice_id, prefijo, numero, concepto, motivo, reintegrar_inventario, total, status,
  provider, provider_reference, cude, dian_ambiente, dian_respuesta, dian_payload, created_at
`;

// Lo que aun se puede acreditar de cada producto (descuenta notas no rechazadas)
export async function getItemsAcreditables(invoiceId, db = pool) {
  const { rows } = await db.query(
    `
    SELECT
      si.producto_id, p.nombre, si.quantity AS cantidad, si.unit_price AS precio_unitario,
      COALESCE(si.iva_tarifa, p.iva_tarifa) AS iva_tarifa,
      COALESCE((
        SELECT SUM(nci.cantidad)
        FROM notas_credito_items nci
        JOIN notas_credito nc ON nc.id = nci.nota_id
        WHERE nc.invoice_id = i.id
          AND nc.status <> 'rechazada'
          AND nci.producto_id = si.producto_id
      ), 0) AS acreditada
    FROM invoices i
    JOIN sale_items si ON si.sale_id = i.sale_id
    JOIN productos p ON p.id = si.producto_id
    WHERE i.id = $1
    ORDER BY p.nombre
    `,
    [invoiceId]
  );
  return rows.map((r) => {
    const cantidad = Number(r.cantidad);
    const acreditada = Number(r.acreditada);
    return {
      producto_id: r.producto_id,
      nombre: r.nombre,
      cantidad,
      acreditada,
      disponible: cantidad - acreditada,
      precio_unitario: Number(r.precio_unitario),
      iva_tarifa: Number(r.iva_tarifa)
    };
  });
}

export async function createNotaCredito({ businessId, invoiceId, concepto, motivo, items, reintegrarInventario }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Bloquea el negocio para que dos notas no tomen el mismo consecutivo
    await client.query("SELECT id FROM businesses WHERE id = $1 FOR UPDATE", [businessId]);

    const facturaResult = await client.query(
      `
      SELECT id, prefijo, numero, status, cufe, dian_payload, created_at
      FROM invoices
      WHERE id = $1
        AND business_id = $2
      FOR UPDATE
      `,
      [invoiceId, businessId]
    );
    const factura = facturaResult.rows[0];
    if (!factura) {
      throw new Error("FACTURA_NO_ENCONTRADA");
    }
    if (factura.status !== "validada") {
      throw new Error("FACTURA_NO_VALIDADA");
    }

    const acreditables = await getItemsAcreditables(invoiceId, client);
    let lineas;
    if (concepto === 2) {
      lineas = acreditables
        .filter((a) => a.disponible > 0)
        .map((a) => ({ ...a, cantidad: a.disponible }));
    } else {
      lineas = items.map((pedido) => {
        const item = acreditables.find((a) => a.producto_id === pedido.producto_id);
        if (!item || pedido.cantidad > item.disponible) {
          throw new Error("CANTIDAD_INVALIDA");
        }
        return { ...item, cantidad: pedido.cantidad };
      });
    }
    if (lineas.length === 0) {
      throw new Error("NADA_POR_ACREDITAR");
    }

    const iva = desglosarIva(
      lineas.map((l) => ({
        nombre: l.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.precio_unitario * l.cantidad,
        iva_tarifa: l.iva_tarifa
      }))
    );
    const total = iva.items.reduce((suma, item) => suma + item.subtotal, 0);

    const numeroResult = await client.query(
      "SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM notas_credito WHERE business_id = $1 AND prefijo = $2",
      [businessId, PREFIJO]
    );
    const numero = Number(numeroResult.rows[0].siguiente);

    const { emisor, cliente } = factura.dian_payload;
    const payload = {
      emisor,
      cliente,
      factura_referencia: {
        codigo: `${factura.prefijo}-${factura.numero}`,
        prefijo: factura.prefijo,
        numero: factura.numero,
        cufe: factura.cufe,
        fecha: factura.created_at
      },
      concepto,
      concepto_texto: CONCEPTOS[concepto],
      motivo,
      items: iva.items,
      subtotal: iva.subtotal,
      impuestos: iva.impuestos,
      total_iva: iva.total_iva,
      total
    };

    const notaResult = await client.query(
      `
      INSERT INTO notas_credito (business_id, invoice_id, prefijo, numero, concepto, motivo, reintegrar_inventario, total, dian_payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${CAMPOS}
      `,
      [businessId, invoiceId, PREFIJO, numero, concepto, motivo, reintegrarInventario, total, JSON.stringify(payload)]
    );
    const nota = notaResult.rows[0];

    for (const linea of lineas) {
      await client.query(
        "INSERT INTO notas_credito_items (nota_id, producto_id, cantidad) VALUES ($1, $2, $3)",
        [nota.id, linea.producto_id, linea.cantidad]
      );
    }

    await client.query("COMMIT");
    return nota;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Devuelve al stock lo acreditado y deja el movimiento de entrada
export async function reintegrarInventario(nota, businessId) {
  const codigo = `${nota.prefijo}-${nota.numero}`;
  const referencia = nota.dian_payload.factura_referencia.codigo;
  const { rows } = await pool.query("SELECT producto_id, cantidad FROM notas_credito_items WHERE nota_id = $1", [nota.id]);
  for (const item of rows) {
    await pool.query("UPDATE productos SET stock = stock + $1 WHERE id = $2 AND business_id = $3", [
      item.cantidad,
      item.producto_id,
      businessId
    ]);
    await pool.query(
      `
      INSERT INTO movimientos_inventario (business_id, producto_id, tipo, cantidad, motivo)
      VALUES ($1, $2, 'entrada', $3, $4)
      `,
      [businessId, item.producto_id, item.cantidad, `Nota credito ${codigo} (factura ${referencia})`]
    );
  }
}

export async function updateNotaDianStatus(id, { status, provider, providerReference, cude, ambiente, respuesta }) {
  const query = `
    UPDATE notas_credito
    SET
      status = $1,
      provider = COALESCE($2, provider),
      provider_reference = COALESCE($3, provider_reference),
      cude = COALESCE($4, cude),
      dian_ambiente = COALESCE($5, dian_ambiente),
      dian_respuesta = COALESCE($6, dian_respuesta),
      updated_at = NOW()
    WHERE id = $7
    RETURNING ${CAMPOS}
  `;
  const { rows } = await pool.query(query, [
    status,
    provider ?? null,
    providerReference ?? null,
    cude ?? null,
    ambiente ?? null,
    respuesta ? JSON.stringify(respuesta) : null,
    id
  ]);
  return rows[0];
}

export async function getNotaById(id, businessId) {
  const { rows } = await pool.query(`SELECT ${CAMPOS} FROM notas_credito WHERE id = $1 AND business_id = $2`, [
    id,
    businessId
  ]);
  return rows[0] || null;
}

export async function getNotasByDateRange(businessId, inicio, fin) {
  const { rows } = await pool.query(
    `
    SELECT id, prefijo || '-' || numero AS codigo, concepto, total, created_at AS fecha
    FROM notas_credito
    WHERE business_id = $1
      AND status <> 'rechazada'
      AND created_at >= $2::timestamptz
      AND created_at <= $3::timestamptz
    ORDER BY created_at
    `,
    [businessId, inicio, fin]
  );
  return rows;
}
