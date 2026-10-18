import { pool } from "../db/pool.js";
import { desglosarIva } from "../services/iva.js";

// Documento que la DIAN usa para "consumidor final"
const CONSUMIDOR_FINAL = "222222222222";

const SELECT_RESOLUCION = `
  SELECT
    id, numero_resolucion, to_char(fecha_resolucion, 'YYYY-MM-DD') AS fecha_resolucion,
    prefijo, rango_desde, rango_hasta, clave_tecnica,
    to_char(vigencia_desde, 'YYYY-MM-DD') AS vigencia_desde,
    to_char(vigencia_hasta, 'YYYY-MM-DD') AS vigencia_hasta,
    CURRENT_DATE BETWEEN vigencia_desde AND vigencia_hasta AS vigente
  FROM resoluciones_facturacion
`;

// Bloquea el negocio para que dos facturas no tomen el mismo consecutivo
async function bloquearNegocio(client, businessId) {
  const { rows } = await client.query(
    "SELECT id, name, nit, address, phone FROM businesses WHERE id = $1 FOR UPDATE",
    [businessId]
  );
  return rows[0];
}

// Venta con los datos actuales del cliente y sus productos
async function cargarVenta(client, businessId, saleId) {
  const saleResult = await client.query(
    `
    SELECT
      s.id, s.customer_name, s.payment_method, s.total, s.created_at,
      c.nombre AS cliente_nombre, c.documento, c.correo, c.telefono, c.direccion
    FROM sales s
    LEFT JOIN clientes c ON c.id = s.cliente_id
    WHERE s.id = $1
      AND s.business_id = $2
    `,
    [saleId, businessId]
  );
  const itemsResult = await client.query(
    `
    SELECT
      p.nombre, si.quantity AS cantidad, si.unit_price AS precio_unitario, si.subtotal,
      COALESCE(si.iva_tarifa, p.iva_tarifa) AS iva_tarifa
    FROM sale_items si
    JOIN productos p ON p.id = si.producto_id
    WHERE si.sale_id = $1
    ORDER BY p.nombre
    `,
    [saleId]
  );
  return { sale: saleResult.rows[0], items: itemsResult.rows };
}

// Copia de los datos al momento de facturar: la factura no cambia si luego se editan
function armarPayload({ business, sale, items, resolucion }) {
  const iva = desglosarIva(
    items.map((item) => ({
      nombre: item.nombre,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      subtotal: Number(item.subtotal),
      iva_tarifa: Number(item.iva_tarifa)
    }))
  );

  return {
    emisor: {
      nombre: business.name,
      nit: business.nit,
      direccion: business.address,
      telefono: business.phone
    },
    cliente: {
      nombre: sale.cliente_nombre || sale.customer_name || "Consumidor final",
      documento: sale.documento || CONSUMIDOR_FINAL,
      correo: sale.correo || null,
      telefono: sale.telefono || null,
      direccion: sale.direccion || null
    },
    venta: {
      id: sale.id,
      fecha: sale.created_at,
      metodo_pago: sale.payment_method
    },
    items: iva.items,
    subtotal: iva.subtotal,
    impuestos: iva.impuestos,
    total_iva: iva.total_iva,
    total: Number(sale.total),
    resolucion: {
      numero: resolucion.numero_resolucion,
      fecha: resolucion.fecha_resolucion,
      prefijo: resolucion.prefijo,
      desde: Number(resolucion.rango_desde),
      hasta: Number(resolucion.rango_hasta),
      vigencia_desde: resolucion.vigencia_desde,
      vigencia_hasta: resolucion.vigencia_hasta
    }
  };
}

async function enTransaccion(trabajo) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await trabajo(client);
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const CAMPOS_NUEVA = "id, prefijo, numero, sale_id, status, total, customer_email, dian_payload, created_at";

export async function createInvoiceFromSale({ businessId, saleId }) {
  return enTransaccion(async (client) => {
    const business = await bloquearNegocio(client, businessId);
    const { sale, items } = await cargarVenta(client, businessId, saleId);
    if (!business || !sale) {
      throw new Error("VENTA_NO_ENCONTRADA");
    }

    const existing = await client.query("SELECT id FROM invoices WHERE sale_id = $1", [saleId]);
    if (existing.rows.length > 0) {
      throw new Error("VENTA_YA_FACTURADA");
    }

    // Numeracion autorizada por la DIAN: la resolucion activa del negocio
    const resolucionResult = await client.query(`${SELECT_RESOLUCION} WHERE business_id = $1 AND activa`, [businessId]);
    const resolucion = resolucionResult.rows[0];
    if (!resolucion) {
      throw new Error("SIN_RESOLUCION");
    }
    if (!resolucion.vigente) {
      throw new Error("RESOLUCION_NO_VIGENTE");
    }

    const numeroResult = await client.query(
      `
      SELECT GREATEST(COALESCE(MAX(numero), 0) + 1, $3) AS siguiente
      FROM invoices
      WHERE business_id = $1
        AND prefijo = $2
      `,
      [businessId, resolucion.prefijo, resolucion.rango_desde]
    );
    const numero = Number(numeroResult.rows[0].siguiente);
    if (numero > Number(resolucion.rango_hasta)) {
      throw new Error("RANGO_AGOTADO");
    }

    const payload = armarPayload({ business, sale, items, resolucion });
    const invoiceResult = await client.query(
      `
      INSERT INTO invoices (business_id, sale_id, prefijo, numero, total, customer_email, dian_payload, resolucion_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${CAMPOS_NUEVA}
      `,
      [businessId, saleId, resolucion.prefijo, numero, payload.total, payload.cliente.correo, JSON.stringify(payload), resolucion.id]
    );

    // La clave tecnica no se guarda en la factura: solo la usa el proveedor para el CUFE
    return { ...invoiceResult.rows[0], clave_tecnica: resolucion.clave_tecnica };
  });
}

// Una factura rechazada nunca tuvo validez: se rearma con los datos corregidos
// y se reenvia con el mismo numero y la fecha de hoy
export async function rebuildRejectedInvoice({ businessId, invoiceId }) {
  return enTransaccion(async (client) => {
    const business = await bloquearNegocio(client, businessId);
    const facturaResult = await client.query(
      "SELECT id, sale_id, status, resolucion_id FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE",
      [invoiceId, businessId]
    );
    const factura = facturaResult.rows[0];
    if (!business || !factura) {
      throw new Error("FACTURA_NO_ENCONTRADA");
    }
    if (factura.status !== "rechazada") {
      throw new Error("FACTURA_NO_RECHAZADA");
    }

    const resolucionResult = await client.query(`${SELECT_RESOLUCION} WHERE id = $1`, [factura.resolucion_id]);
    const resolucion = resolucionResult.rows[0];
    if (!resolucion) {
      throw new Error("SIN_RESOLUCION");
    }
    if (!resolucion.vigente) {
      throw new Error("RESOLUCION_NO_VIGENTE");
    }

    const { sale, items } = await cargarVenta(client, businessId, factura.sale_id);
    const payload = armarPayload({ business, sale, items, resolucion });
    const invoiceResult = await client.query(
      `
      UPDATE invoices
      SET dian_payload = $1, total = $2, customer_email = $3, status = 'pendiente',
          cufe = NULL, dian_respuesta = NULL, created_at = NOW(), updated_at = NOW()
      WHERE id = $4
      RETURNING ${CAMPOS_NUEVA}
      `,
      [JSON.stringify(payload), payload.total, payload.cliente.correo, factura.id]
    );

    return { ...invoiceResult.rows[0], clave_tecnica: resolucion.clave_tecnica };
  });
}

const CAMPOS_FACTURA = `
  id, prefijo, numero, sale_id, status, provider, provider_reference, total, customer_email,
  enviada_a, enviada_at, cufe, dian_ambiente, dian_respuesta, dian_payload, created_at
`;

// Guarda lo que responde el proveedor; los campos omitidos se conservan
export async function updateInvoiceDianStatus(id, { status, provider, providerReference, cufe, ambiente, respuesta }) {
  const query = `
    UPDATE invoices
    SET
      status = $1,
      provider = COALESCE($2, provider),
      provider_reference = COALESCE($3, provider_reference),
      cufe = COALESCE($4, cufe),
      dian_ambiente = COALESCE($5, dian_ambiente),
      dian_respuesta = COALESCE($6, dian_respuesta),
      updated_at = NOW()
    WHERE id = $7
    RETURNING ${CAMPOS_FACTURA}
  `;
  const { rows } = await pool.query(query, [
    status,
    provider ?? null,
    providerReference ?? null,
    cufe ?? null,
    ambiente ?? null,
    respuesta ? JSON.stringify(respuesta) : null,
    id
  ]);
  return rows[0];
}

export async function getInvoicesByBusiness(businessId) {
  const query = `
    SELECT
      id, prefijo, numero, sale_id, status, total, created_at,
      customer_email, enviada_a, enviada_at,
      dian_payload->'cliente'->>'nombre' AS cliente_nombre,
      dian_respuesta->'mensajes' AS dian_mensajes
    FROM invoices
    WHERE business_id = $1
    ORDER BY numero DESC NULLS LAST, created_at DESC
  `;
  const { rows } = await pool.query(query, [businessId]);
  return rows;
}

export async function getInvoiceById(id, businessId) {
  const query = `
    SELECT ${CAMPOS_FACTURA}
    FROM invoices
    WHERE id = $1
      AND business_id = $2
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [id, businessId]);
  return rows[0] || null;
}

export async function markInvoiceSent(id, correo) {
  const query = `
    UPDATE invoices
    SET enviada_a = $1, enviada_at = NOW(), updated_at = NOW()
    WHERE id = $2
    RETURNING enviada_a, enviada_at
  `;
  const { rows } = await pool.query(query, [correo, id]);
  return rows[0];
}
