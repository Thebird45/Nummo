INSERT INTO businesses (id, name, nit, address, phone, plan, trial_ends_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Panaderia La 80',
  '901234567-8',
  'Calle 80 #45-10, Medellin',
  '3001234567',
  'pro',
  NOW() + INTERVAL '15 days'
)
ON CONFLICT (nit) DO NOTHING;

INSERT INTO users (id, business_id, full_name, email, password_hash, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Usuario Demo',
  'demo@nummo.co',
  '$2a$10$oZYBAZCvLX4TVYywo9MXjec8ceJAW3D75P0CjDiwUXvtgREo7XL32',
  'dueno'
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

INSERT INTO productos (business_id, nombre, descripcion, precio, stock, stock_minimo)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Pan Frances', 'Pan blando para consumo diario', 1200, 45, 20),
  ('11111111-1111-1111-1111-111111111111', 'Croissant', 'Hojaldre de mantequilla', 3200, 8, 10),
  ('11111111-1111-1111-1111-111111111111', 'Cafe Americano', 'Cafe filtrado 9 oz', 2500, 18, 8)
ON CONFLICT DO NOTHING;

INSERT INTO sales (business_id, seller_id, customer_name, payment_method, total, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Cliente de mostrador', 'efectivo', 35000, NOW() - INTERVAL '1 day'),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Empresa ABC SAS', 'transferencia', 56000, NOW()),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Cliente de mostrador', 'efectivo', 29000, NOW())
ON CONFLICT DO NOTHING;

INSERT INTO invoices (business_id, prefijo, numero, provider, provider_reference, status, customer_email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'FE', 1, 'plemsi', 'PLM-1001', 'validada', 'cliente1@correo.com'),
  ('11111111-1111-1111-1111-111111111111', 'FE', 2, 'plemsi', 'PLM-1002', 'pendiente', 'cliente2@correo.com')
ON CONFLICT DO NOTHING;
