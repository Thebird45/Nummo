# Nummo

Aplicacion web SaaS para pequenos negocios en Colombia.

## Modulos
- Autenticacion (registro de negocio, login seguro, roles)
- Dashboard principal (ventas, ingresos, facturas, stock bajo, ventas semanales)
- Inventario completo (CRUD, alertas de bajo stock, movimientos entrada/salida, tabs internos)
- POS (catalogo, carrito, historial de ventas, tabs internos)
- Reportes (KPIs, graficas Recharts, metodos de pago, productos top, clientes, tabs internos)
- Clientes (CRUD, busqueda, historial de compras, selector en POS)
- Estructura inicial para: facturacion

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
│       │   ├── InventarioPage.jsx   # Tabs: Productos | Categorias | Stock bajo | Movimientos
│       │   ├── LoginPage.jsx
│       │   ├── PlaceholderPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ReportesPage.jsx     # Tabs: Resumen | Ventas | Productos | Pagos | Clientes
│       │   └── VentasPage.jsx       # Tabs: Catalogo | Carrito | Historial
│       └── services/
│           ├── api.js               # Axios instance con interceptor JWT (export nombrado)
│           ├── auth.js
│           ├── clientes.js          # CRUD clientes — usa import { api } nombrado
│           ├── dashboard.js
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
        │   ├── productModel.js
        │   ├── saleModel.js         # createPosSale acepta clienteId. JOIN a clientes en reportes
        │   └── userModel.js
        ├── routes/
        │   ├── index.js             # Router raiz /api — sin rutas duplicadas
        │   ├── auth.js
        │   ├── clientes.js          # ESModule. Usa requireAuth
        │   ├── dashboard.js
        │   ├── facturas.js
        │   ├── inventario.js
        │   ├── productos.js
        │   ├── reportes.js
        │   └── ventas.js            # checkoutSchema incluye cliente_id opcional
        └── services/
            └── dianService.js       # Stub para integracion DIAN (Plemsi/Aliaddo)
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
- Correo: benitesjuan86@gmail.com
- Contrasena: Juan23901

## Integracion DIAN
Archivo base: `server/src/services/dianService.js`
Actualmente en modo stub para conectar API real de Plemsi/Aliaddo.

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

## Estado actual (abril 2026)

### Funciona correctamente
- Login y registro
- Dashboard
- Inventario (CRUD, movimientos, stock bajo)
- POS (catalogo, carrito, cobro, historial con filtros)
- Pagina de Clientes: carga, formulario abre, UI completa y funcional
- Sidebar con todos los modulos

### Errores pendientes por resolver

#### ERROR 1 — `GET /api/clientes` falla con error interno
- **Sintoma:** La pagina `/clientes` muestra "Error al cargar clientes" al entrar
- **Causa probable:** `clienteModel.getAll()` falla en la query SQL. El `businessId` que viene del JWT puede tener un formato distinto al esperado por la query, o hay un problema con el tipo UUID en el WHERE
- **Como depurar:** Abrir `/clientes` y revisar los logs del backend en la terminal. Buscar el mensaje de error de PostgreSQL
- **Archivos a revisar:** `server/src/models/clienteModel.js` funcion `getAll`, y verificar que `req.user.businessId` llega correctamente desde `authMiddleware.js`

#### ERROR 2 — Reportes muestra "Error interno del servidor"
- **Sintoma:** `/reportes` no carga datos
- **Causa probable:** `getSalesByDateRange` en `saleModel.js` hace `LEFT JOIN clientes` — si hay algun problema con esa tabla o la query, falla. Tambien puede ser un error preexistente
- **Como depurar:** Abrir `/reportes` y revisar logs del backend
- **Archivos a revisar:** `server/src/models/saleModel.js` funcion `getSalesByDateRange`

#### PENDIENTE — Crear cliente no verificado end-to-end
- El formulario abre correctamente pero no se confirmo que el `POST /api/clientes` guarde en la DB
- Depende de resolver ERROR 1 primero
- **Como probar:** Llenar formulario en `/clientes` y presionar "Crear cliente". Revisar logs del backend si falla

#### PENDIENTE — Selector de cliente en POS no verificado
- El select existe en el carrito pero no se confirmo que muestre clientes reales
- Depende de resolver ERROR 1 (necesita que `GET /api/clientes` funcione)

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

## Probar inventario rapido
1. `http://localhost:5173/inventario`
2. Crear producto y verificar tabla
3. Agregar/retirar stock
4. Verificar movimientos en tab Movimientos

## Probar POS rapido
1. `http://localhost:5173/ventas`
2. Agregar productos al carrito
3. Seleccionar cliente del selector (requiere ERROR 1 resuelto)
4. Cobrar y verificar ticket, descuento de stock y movimiento de salida

## Probar clientes rapido
1. `http://localhost:5173/clientes`
2. Crear cliente con nombre y documento
3. Verificar que aparece en la lista
4. Verificar que aparece en selector del POS
5. Hacer venta con ese cliente
6. Volver a Clientes → Historial y verificar la venta

## Probar reportes rapido
1. `http://localhost:5173/reportes`
2. Cambiar periodo (hoy, semana, mes, personalizado)
3. Verificar KPIs y graficas

---

## Siguientes pasos recomendados

1. **Depurar ERROR 1** — `GET /api/clientes` falla. Revisar logs backend y `authMiddleware.js` para confirmar formato de `businessId`
2. **Depurar ERROR 2** — Reportes falla. Revisar `getSalesByDateRange` y el JOIN a clientes
3. **Implementar Facturacion** — emision de factura desde venta existente, PDF descargable, numeracion consecutiva DIAN
4. **Integracion real DIAN** — conectar Plemsi o Aliaddo en `dianService.js`
5. **Reportes PDF** — exportar reportes descargables
6. **Pruebas automatizadas** — Jest para backend, Vitest para fronten