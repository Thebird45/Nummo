// Mock data for Reportes module
// 90 days of sales history

const PRODUCTOS = [
  { id: "1", nombre: "Café Americano", precio: 3500, categoria: "Bebidas" },
  { id: "2", nombre: "Croissant", precio: 4500, categoria: "Panes" },
  { id: "3", nombre: "Capuchino", precio: 5500, categoria: "Bebidas" },
  { id: "4", nombre: "Agua", precio: 2000, categoria: "Bebidas" },
  { id: "5", nombre: "Jugo Natural", precio: 6000, categoria: "Bebidas" }
];

const CLIENTES_EMPRESAS = [
  { id: "empresa-1", nombre: "Oficinas Acme" },
  { id: "empresa-2", nombre: "Startup Tech Co" },
  { id: "empresa-3", nombre: "Consultores Unidos" },
  { id: "mostrador", nombre: "Mostrador" }
];

const METODOS_PAGO = ["efectivo", "transferencia", "tarjeta"];

function generarFechas90Dias() {
  const fechas = [];
  const hoy = new Date();
  
  for (let i = 89; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - i);
    fechas.push(fecha);
  }
  
  return fechas;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarVentas() {
  const ventas = [];
  const fechas = generarFechas90Dias();
  let ventaId = 1;
  
  fechas.forEach((fecha) => {
    const ventasDelDia = randInt(5, 20);
    
    for (let i = 0; i < ventasDelDia; i++) {
      const hora = randInt(7, 19);
      const minuto = randInt(0, 59);
      
      fecha.setHours(hora, minuto, randInt(0, 59));
      
      const fechaVenta = new Date(fecha);
      
      // Generar items de la venta
      const cantidadItems = randInt(1, 3);
      const items = [];
      let totalVenta = 0;
      
      for (let j = 0; j < cantidadItems; j++) {
        const producto = PRODUCTOS[randInt(0, PRODUCTOS.length - 1)];
        const cantidad = randInt(1, 2);
        const subtotal = producto.precio * cantidad;
        items.push({
          producto_id: producto.id,
          nombre: producto.nombre,
          cantidad,
          precio_unitario: producto.precio,
          subtotal
        });
        totalVenta += subtotal;
      }
      
      // Generar cliente (70% mostrador, 30% empresas)
      let cliente;
      if (Math.random() < 0.7) {
        cliente = { id: "mostrador", nombre: "Mostrador" };
      } else {
        cliente = CLIENTES_EMPRESAS[randInt(1, 3)];
      }
      
      ventas.push({
        id: `venta-${ventaId++}`,
        fecha: fechaVenta.toISOString(),
        cliente_id: cliente.id,
        customer_name: cliente.nombre,
        items,
        total: totalVenta,
        payment_method: METODOS_PAGO[
          Math.random() < 0.6 ? 0 : Math.random() < 0.75 ? 1 : 2
        ],
        created_at: fechaVenta.toISOString()
      });
    }
  });
  
  return ventas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

export function obtenerDatosMockReportes() {
  return generarVentas();
}

export function obtenerProductosMostrados() {
  return PRODUCTOS;
}

export function obtenerClientesUnicos() {
  return CLIENTES_EMPRESAS;
}
