import { pool } from "../db/pool.js";

export async function createBusiness({
  name,
  nit,
  address,
  phone,
  plan,
  trialEndsAt
}) {
  const query = `
    INSERT INTO businesses (name, nit, address, phone, plan, trial_ends_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, nit, address, phone, plan, trial_ends_at, created_at
  `;

  const { rows } = await pool.query(query, [
    name,
    nit,
    address,
    phone,
    plan,
    trialEndsAt
  ]);

  return rows[0];
}

export async function getBusinessById(id) {
  const query = `
    SELECT id, name, nit, address, phone, plan, trial_ends_at, created_at
    FROM businesses
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}
