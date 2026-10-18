# Nummo

Aplicacion web SaaS para pequenos negocios en Colombia.

## Modulos
- Autenticacion (registro de negocio, login seguro, roles)
- Dashboard principal (ventas, ingresos, facturas, stock bajo, ventas semanales)
- Inventario completo (CRUD, IVA por producto, alertas de bajo stock, movimientos entrada/salida, tabs internos)
- POS (catalogo, carrito, historial de ventas, tabs internos)
- Reportes (KPIs, graficas Recharts, metodos de pago, productos top, clientes, tabs internos, exportar PDF)
- Clientes (CRUD, busqueda, historial de compras, selector en POS)
- Facturacion electronica (factura desde una venta, numeracion por resolucion DIAN, IVA desglosado, CUFE y QR, validacion DIAN, PDF, envio por correo)
- Configuracion (resolucion de numeracion DIAN con alertas de vencimiento y rango)

## Estructura del proyecto

```
Nummo/
├── docker-compose.yml
├── README.md
│
├── docs/
│   └── arquitectura.md
│
├── client/                          # Frontend: React 18 + Vite + Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                  # Rutas y contexto global (sin duplicados)
│       ├── styles.css
│       ├── components/
│       │   ├── ProtectedRoute.jsx
│       │   ├── Sidebar.jsx
│       │   ├── StatCard.jsx
│       │   └── reportes/
│       │       ├── FiltrosPeriodo.jsx
│       │       ├── GraficaVentas.jsx
│       │       ├── KPICard.jsx
│       │       ├── MetodosPago.jsx
│       │       ├── ProductosTop.jsx
│       │       └── TablaVentas.jsx
│       ├── data/
│       │   └── mockReportes.js      # Generador de 90 dias de ventas mock
│       ├── pages/
│       │   ├── ClientesPage.jsx     # Tabs: Lista | Historial
│       │   ├── DashboardPage.jsx
│       │   ├── FacturasPage.jsx     # Lista, busqueda y descarga de PDF
│       │   ├── InventarioPage.jsx   # Tabs: Productos | Categorias | Stock bajo | Movimientos
│       │   ├── LoginPage.jsx
│       │   ├── PlaceholderPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ReportesPage.jsx     # Tabs: Resumen | Ventas | Productos | Pagos | Clientes
│       │   └── VentasPage.jsx       # Tabs: Catalogo | Carrito | Historial (boton Facturar)
│       └── services/
│           ├── api.js               # Axios instance con interceptor JWT (export nombrado)
│           ├── auth.js
│           ├── clientes.js          # CRUD clientes — usa import { api } nombrado
│           ├── dashboard.js
│           ├── descargas.js         # Descarga de PDFs con token (blob)
│           ├── facturas.js          # Crear, enviar y descargar facturas
│           ├── inventory.js
│           └── pos.js
│
└── server/                          # Backend: Node.js + Express + PostgreSQL
    ├── package.json
    ├── .env.example
    └── src/
        ├── app.js                   # Express app, middlewares
        ├── server.js                # Entry point
        ├── config/
        │   └── env.js
        ├── db/
        │   ├── pool.js              # pg pool
        │   ├── runSql.js
        │   ├── schema.sql           # DDL de tablas
        │   └── seed.sql             # Datos iniciales
        ├── middleware/
        │   ├── authMiddleware.js    # Verificacion JWT (export: requireAuth)
        │   └── errorHandler.js
        ├── models/
        │   ├── businessModel.js
        │   ├── clienteModel.js      # CRUD clientes. ESModule. business_id UUID
        │   ├── dashboardModel.js
        │   ├── inventoryModel.js
        │   ├── invoiceModel.js      # Factura desde venta, consecutivo por negocio
        │   ├── productModel.js
        │   ├── saleModel.js         # createPosSale acepta clienteId. JOIN a clientes en reportes
        │   └── userModel.js
        ├── routes/
        │   ├── index.js             # Router raiz /api — sin rutas duplicadas
        │   ├── auth.js
        │   ├── clientes.js          # ESModule. Usa requireAuth
        │   ├── dashboard.js
        │   ├── facturas.js          # CRUD facturas + PDF
        │   ├── inventario.js
        │   ├── productos.js
        │   ├── reportes.js
        │   └── ventas.js            # checkoutSchema incluye cliente_id opcional
        └── services/
            ├── dianService.js       # Stub para integracion DIAN (Plemsi/Aliaddo)
            ├── emailService.js      # Nodemailer; sin SMTP_HOST el envio se simula
            ├── reportPdf.js         # PDF del reporte de ventas (KPIs, grafica, tablas)
            ├── reportSummary.js     # Resumen de ventas por periodo (dia/semana/mes)
            ├── iva.js               # Desglose base/IVA (precios con IVA incluido)
            └── invoicePdf.js        # Genera el PDF con pdfkit
```

## Requisitos
- Node.js 20+
- Docker (recomendado para PostgreSQL)

## 1) Levantar PostgreSQL
Desde la raiz:

```bash
docker compose up -d
```

## 2) Base de datos
En PowerShell usar `Get-Content` en lugar de `<` (no soportado):

```powershell
Get-Content server/src/db/schema.sql | docker exec -i nummo-postgres psql -U postgres -d nummo
Get-Content server/src/db/seed.sql | docker exec -i nummo-postgres psql -U postgres -d nummo
```

Migraciones adicionales requeridas:

```powershell
# Tabla clientes — business_id es UUID porque businesses.id es UUID
docker exec -it nummo-postgres psql -U postgres -d nummo -c "CREATE TABLE IF NOT EXISTS clientes (id SERIAL PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, nombre VARCHAR(200) NOT NULL, documento VARCHAR(30), telefono VARCHAR(20), correo VARCHAR(100), direccion TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());"

# Columna cliente_id en tabla sales
docker exec -it nummo-postgres psql -U postgres -d nummo -c "ALTER TABLE sales ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id);"
```

## 3) Backend
```bash
cd server
copy .env.example .env
npm install
npm run dev
```

API en: `http://localhost:4000/api`

## 4) Frontend
```bash
cd client
npm install
npm run dev
```

App en: `http://localhost:5173`

> Nota Windows: `psql` no esta en el PATH por defecto. Usar siempre `docker exec` para comandos SQL.

## Flujo de autenticacion
1. Registro de negocio desde `/registro`
2. Login desde `/login`
3. Se almacena JWT en `localStorage`
4. Rutas protegidas por token

## Credenciales predeterminadas (seed)
- Correo: demo@nummo.co
- Contrasena: demo12345

Solo para desarrollo local; no usar datos reales en el seed.

## Facturacion electronica (DIAN)
La emision pasa por un **proveedor tecnologico** intercambiable (`server/src/services/dianService.js`), elegido con `DIAN_PROVIDER`:

| Proveedor | Estado | Uso |
|---|---|---|
| `simulado` | listo | Ambiente de pruebas: sin validez fiscal, el PDF lo indica |
| `plemsi` | pendiente | Produccion (requiere cuenta y resolucion de numeracion) |

Flujo: al crear la factura se **valida** (NIT con digito de verificacion, productos, totales, desglose de IVA) → si falla queda `rechazada` con los motivos; si pasa se calcula el **CUFE** y queda `pendiente` → `POST /consultar-estado` la pasa a `validada` (el simulado tarda `DIAN_SIM_SEGUNDOS`).

- **CUFE:** SHA-384 del Anexo Tecnico 1.9 (seccion 11.2), verificado contra el ejemplo oficial de la DIAN en los tests. Usa `DIAN_CLAVE_TECNICA`, que en produccion entrega la DIAN con la resolucion de numeracion.
- **QR:** datos de la factura + enlace a `catalogo-vpfe` (o `catalogo-vpfe-hab` en pruebas).
- **NIT:** se valida el digito de verificacion al registrar el negocio, al crear/editar clientes y antes de enviar a la DIAN.

### Resolucion de numeracion
Cada negocio registra en **Configuracion** la autorizacion de numeracion que le expide la DIAN: numero y fecha de resolucion, prefijo (hasta 4 caracteres), rango (desde/hasta), vigencia y clave tecnica.
- Solo el **dueno** puede registrarla. Una nueva reemplaza a la activa; las anteriores quedan en el historial.
- Al facturar se usa la activa: el numero sale de su rango, el CUFE usa su clave tecnica (si no tiene, `DIAN_CLAVE_TECNICA`) y el PDF incluye la leyenda de la autorizacion.
- Sin resolucion, vencida o con el rango agotado **no se puede facturar** (409 con el motivo).
- Alertas cuando faltan 30 dias o menos para vencer o queda el 10 % del rango.
- `GET /api/resoluciones` (activa, alertas, historial) y `POST /api/resoluciones`.
- El negocio del seed trae una resolucion de pruebas (FE del 1 al 5000).

## Endpoints reportes
- `GET /api/reportes?inicio&fin` — ventas del periodo (ISO). Sin fechas: ultimos 30 dias
- `GET /api/reportes/pdf?inicio&fin` — PDF con total, transacciones, ticket promedio, grafica (por dia hasta 31 dias, por semana hasta ~6 meses, luego por mes), metodos de pago, productos y clientes top

## Correo (SMTP)
Configura en `server/.env` (ver `.env.example`). Sin `SMTP_HOST` el envio se **simula**: no sale ningun correo y la app lo avisa.

Ejemplo con Gmail (requiere verificacion en 2 pasos y una [contrasena de aplicacion](https://myaccount.google.com/apppasswords)):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=contrasena_de_aplicacion
EMAIL_FROM=tu_correo@gmail.com
```

## Fechas y zona horaria
- Todas las fechas son `TIMESTAMPTZ` (guardan el instante exacto).
- `APP_TIMEZONE` (por defecto `America/Bogota`) define que es "hoy" en dashboard y reportes, y la fecha del PDF.
- Bases creadas antes: al correr `schema.sql` las columnas `TIMESTAMP` se convierten asumiendo que guardaban UTC (lo normal en el Postgres de Docker). Es seguro correrlo varias veces.

## Endpoints facturacion
- `GET /api/facturas` — lista (mas reciente primero)
- `POST /api/facturas` — `{ sale_id }`; una factura por venta, consecutivo `FE-n` por negocio
- `GET /api/facturas/:id` — detalle con copia de emisor, cliente e items
- `GET /api/facturas/:id/pdf` — descarga el PDF (con CUFE y QR)
- `POST /api/facturas/:id/consultar-estado` — consulta al proveedor si la factura ya fue validada
- `POST /api/facturas/:id/reenviar` — rearma una factura **rechazada** con los datos actuales (cliente, productos) y la reenvia con el mismo numero y la fecha de hoy
- `POST /api/facturas/:id/enviar` — `{ correo? }`; envia el PDF adjunto (por defecto al correo del cliente) y guarda `enviada_a` / `enviada_at`

Sin cliente, la factura sale a "Consumidor final" (`222222222222`).

**IVA:** cada producto tiene tarifa 0, 5 o 19 % (19 por defecto) y su precio **incluye IVA**. Al vender, la tarifa se copia a `sale_items`; la factura calcula base e IVA por tarifa (en centavos, base + IVA = total exacto). Facturas creadas antes del modulo se numeran al correr `schema.sql`, pero no tienen PDF.

## Endpoints inventario
- `GET /api/productos`
- `POST /api/productos`
- `PUT /api/productos/:id`
- `DELETE /api/productos/:id`
- `GET /api/productos/bajo-stock`
- `GET /api/productos/disponibles`
- `GET /api/inventario/movimientos`
- `POST /api/inventario/movimientos`

## Endpoints POS
- `GET /api/ventas`
- `GET /api/ventas/productos-disponibles`
- `POST /api/ventas` — acepta `cliente_id` opcional

## Endpoints clientes
- `GET /api/clientes`
- `GET /api/clientes/:id`
- `GET /api/clientes/:id/historial`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`

## Endpoints reportes
- `GET /api/reportes?inicio=ISO&fin=ISO`

Todos requieren token JWT y filtran estrictamente por `business_id`.

---

## Notas tecnicas importantes

### ESModules vs CommonJS
El backend usa ESModules (`import/export`) en todos los archivos. No mezclar con `require/module.exports`.

### Tipos de ID en la base de datos
- `businesses.id` → `UUID`
- `clientes.business_id` → `UUID` (debe coincidir con `businesses.id`)
- `clientes.id` → `SERIAL` (INTEGER)
- `sales.cliente_id` → `INTEGER` referenciando `clientes.id`

### Export de api.js
`api.js` usa export nombrado: `export const api = axios.create(...)`.
Importar siempre como `import { api } from './api'`, nunca como default.

---

## Estado actual (octubre 2026)

### Funciona correctamente
- Login y registro
- Dashboard
- Inventario (CRUD, movimientos, stock bajo)
- POS (catalogo, carrito, cobro, historial con filtros)
- Clientes (CRUD, historial de compras, aislado por negocio)
- Reportes (`/api/reportes` con nombre del cliente) y exportar a PDF
- Facturacion: facturar desde el historial del POS o tras cobrar, pagina `/facturas`, PDF y envio por correo
- IVA por producto (0/5/19 %) y desglose en factura y PDF
- Fechas en hora de Colombia: columnas `TIMESTAMPTZ` y sesion de la DB en `APP_TIMEZONE`
- Sidebar con todos los modulos
- Tests de backend + CI en cada PR

### Resuelto (octubre 2026)
- ERROR 1 (`GET /api/clientes`) y ERROR 2 (reportes): `schema.sql` creaba `clientes.business_id` como `INTEGER` contra `businesses.id` `UUID`, asi que la tabla no existia. Corregido a `UUID` y se agrego `sales.cliente_id` (PR #1)

### Pendiente
- Probar en el navegador el selector de cliente del POS (la API ya esta cubierta por tests)
- Facturas emitidas antes del IVA no tienen desglose (el PDF muestra solo el total)
- DIAN en ambiente de pruebas (proveedor `simulado`): las facturas no tienen validez fiscal
- Facturas validadas no se pueden anular ni corregir todavia (faltan notas credito)

---

## Correcciones aplicadas (abril 2026)

### Errores criticos corregidos
- `SyntaxError: Unexpected token '}'` en `saleModel.js` por llave sobrante
- `ReportesPage` migrado de mock a backend real (`/api/reportes`)
- `InventarioPage` migrado de movimientos hardcodeados a `GET /api/inventario/movimientos`
- Identificador de venta en historial POS corregido (`sale.id`)
- Ruta duplicada `/clientes` en `App.jsx` eliminada
- Ruta duplicada `/clientes` en `routes/index.js` eliminada (mezclaba `require` con ESModule `import`)
- `clientes.js` (ruta y modelo) convertidos de CommonJS a ESModules
- `clienteModel.js` corregido para usar `UUID` en `business_id` (businesses.id es UUID)
- `client/src/services/clientes.js` corregido para usar `import { api }` nombrado

### Mejoras funcionales aplicadas
- Interceptor global `401` en `api.js` — limpia token y redirige a `/login`
- Confirmacion antes de eliminar productos en inventario
- Validacion `trim()` en nombre de producto
- Stock bajo usa `stock_minimo` real de cada producto
- Mensaje de exito en POS se limpia automaticamente a los 3 segundos
- Historial POS con filtros por cliente y metodo de pago
- Selector de cliente real en POS reemplaza campo de texto libre
- `saleModel.js` persiste `cliente_id` en cada venta
- `ventas.js` valida y pasa `cliente_id` al modelo con schema Zod
- `getSalesByDateRange` incluye `LEFT JOIN clientes` para traer `cliente_nombre` en reportes

## Archivos modificados o creados en sesion abril 2026

| Archivo | Operacion | Descripcion |
|---|---|---|
| `server/src/models/clienteModel.js` | Creado | ESModule. CRUD clientes. business_id UUID. Tablas reales (sales, sale_items) |
| `server/src/routes/clientes.js` | Creado/reescrito | ESModule. Usa requireAuth en lugar de auth |
| `server/src/routes/index.js` | Modificado | Eliminada ruta duplicada con require |
| `server/src/models/saleModel.js` | Modificado | cliente_id en INSERT y SELECT. LEFT JOIN clientes en getSalesByDateRange |
| `server/src/routes/ventas.js` | Modificado | cliente_id en schema Zod y en llamada a createPosSale |
| `client/src/services/clientes.js` | Creado | Usa import { api } nombrado |
| `client/src/pages/ClientesPage.jsx` | Creado | Tabs Lista e Historial. CRUD completo. Busqueda en tiempo real |
| `client/src/pages/VentasPage.jsx` | Modificado | Selector de cliente real. Estados clienteId y clientes |
| `client/src/App.jsx` | Modificado | Ruta /clientes sin duplicados. ClientesPage importada |

---

## Tests (backend)

Usan PGlite (Postgres en memoria), no requieren Docker:

```bash
cd server
npm test
```

Corren automaticamente en cada PR hacia `main` (GitHub Actions).

## Probar inventario rapido
1. `http://localhost:5173/inventario`
2. Crear producto y verificar tabla
3. Agregar/retirar stock
4. Verificar movimientos en tab Movimientos

## Probar POS rapido
1. `http://localhost:5173/ventas`
2. Agregar productos al carrito
3. Seleccionar cliente del selector
4. Cobrar y verificar ticket, descuento de stock y movimiento de salida

## Probar clientes rapido
1. `http://localhost:5173/clientes`
2. Crear cliente con nombre y documento
3. Verificar que aparece en la lista
4. Verificar que aparece en selector del POS
5. Hacer venta con ese cliente
6. Volver a Clientes → Historial y verificar la venta

## Probar IVA rapido
1. `http://localhost:5173/inventario` → "Agregar producto" → elegir IVA (19, 5 o 0 %)
2. La tabla muestra "IVA x% incluido" bajo el precio
3. Vender y facturar: el PDF muestra subtotal sin IVA, IVA por tarifa y total

## Probar facturacion rapido
1. `http://localhost:5173/ventas` → tab Historial
2. Presionar "Facturar" en una venta (o "Generar factura" justo despues de cobrar)
3. Ver el codigo `FE-n` en la venta y descargar el PDF
4. `http://localhost:5173/facturas` → buscar, descargar y "Enviar" por correo (simulado si no hay SMTP)

## Probar reportes rapido
1. `http://localhost:5173/reportes`
2. Cambiar periodo (hoy, semana, mes, personalizado)
3. Verificar KPIs y graficas
4. "Exportar PDF" descarga el reporte del periodo elegido

---

## Siguientes pasos recomendados

Para salir a produccion (vender a pymes):
1. **Notas credito** — anular o corregir facturas validadas (devolucion y anulacion)
2. **Adaptador Plemsi (o Aliaddo)** — `DIAN_PROVIDER=plemsi`; requiere cuenta del proveedor
3. **Tests de frontend** — Vitest + Testing Library en `client`