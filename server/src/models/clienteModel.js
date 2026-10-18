import { pool } from "../db/pool.js";

const clienteModel = {
  async getAll(businessId) {
    const { rows } = await pool.query(
      `SELECT * FROM clientes WHERE business_id = $1::uuid ORDER BY nombre ASC`,
      [businessId]
    );
    return rows;
  },

  async getById(id, businessId) {
    const { rows } = await pool.query(
      `SELECT * FROM clientes WHERE id = $1 AND business_id = $2::uuid`,
      [id, businessId]
    );
    return rows[0];
  },

  async create({ business_id, nombre, documento, telefono, correo, direccion }) {
    const { rows } = await pool.query(
      `INSERT INTO clientes (business_id, nombre, documento, telefono, correo, direccion)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)
       RETURNING *`,
      [business_id, nombre.trim(), documento || null, telefono || null, correo || null, direccion || null]
    );
    return rows[0];
  },

  async update(id, businessId, { nombre, documento, telefono, correo, direccion }) {
    const { rows } = await pool.query(
      `UPDATE clientes
       SET nombre=$1, documento=$2, telefono=$3, correo=$4, direccion=$5, updated_at=NOW()
       WHERE id=$6 AND business_id=$7::uuid
       RETURNING *`,
      [nombre.trim(), documento || null, telefono || null, correo || null, direccion || null, id, businessId]
    );
    return rows[0];
  },

  async delete(id, businessId) {
    const { rowCount } = await pool.query(
      `DELETE FROM clientes WHERE id=$1 AND business_id=$2::uuid`,
      [id, businessId]
    );
    return rowCount > 0;
  },

  async getHistorial(id, businessId) {
    const { rows } = await pool.query(
      `SELECT
         v.id,
         v.total,
         v.payment_method,
         v.created_at,
         COUNT(si.id) AS cantidad_items
       FROM sales v
       LEFT JOIN sale_items si ON si.sale_id = v.id
       WHERE v.cliente_id = $1
         AND v.business_id = $2::uuid
       GROUP BY v.id
       ORDER BY v.created_at DESC
       LIMIT 50`,
      [id, businessId]
    );
    return rows;
  }
};

export default clienteModel;