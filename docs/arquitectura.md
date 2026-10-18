# Nummo - Arquitectura base

## Stack
- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- DB: PostgreSQL
- Auth: JWT

## Flujo DIAN (inicial)
1. La app genera datos de factura
2. Backend llama al servicio intermediario (`dianService.js`)
3. Proveedor autorizado (Plemsi/Aliaddo) procesa envio a DIAN
4. Se guarda estado (`validada`, `rechazada`, `pendiente`) y referencia
5. Se envia PDF al cliente por correo (pendiente de implementar)

## Planes de suscripcion
- Basico: $49.000 COP/mes, hasta 100 facturas/mes
- Pro: $79.000 COP/mes, facturas ilimitadas + reportes avanzados
- Trial: 15 dias gratis
