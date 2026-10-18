import { pool } from "../db/pool.js";

export async function createUser({
  businessId,
  fullName,
  email,
  passwordHash,
  role
}) {
  const query = `
    INSERT INTO users (business_id, full_name, email, password_hash, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, business_id, full_name, email, role, created_at
  `;

  const { rows } = await pool.query(query, [
    businessId,
    fullName,
    email,
    passwordHash,
    role
  ]);

  return rows[0];
}

export async function getUserByEmail(email) {
  const query = `
    SELECT id, business_id, full_name, email, password_hash, role, created_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [email.toLowerCase()]);
  return rows[0] || null;
}

export async function getSafeUserById(id) {
  const query = `
    SELECT id, business_id, full_name, email, role, created_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}
