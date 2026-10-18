const METODOS = { efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta" };
const DIA_MS = 24 * 60 * 60 * 1000;

// "2026-10-17" en la zona del negocio
function diaLocal(fecha, timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(fecha));
}

// Lunes de la semana de un dia "YYYY-MM-DD"
function inicioSemana(dia) {
  const fecha = new Date(`${dia}T00:00:00Z`);
  const desdeLunes = (fecha.getUTCDay() + 6) % 7;
  return new Date(fecha.getTime() - desdeLunes * DIA_MS).toISOString().slice(0, 10);
}

function agrupador(inicio, fin) {
  const dias = (new Date(fin) - new Date(inicio)) / DIA_MS;
  if (dias <= 31) return { tipo: "dia", clave: (dia) => dia };
  if (dias <= 182) return { tipo: "semana", clave: inicioSemana };
  return { tipo: "mes", clave: (dia) => dia.slice(0, 7) };
}

function top(map, ordenarPor, limite) {
  return [...map.values()].sort((a, b) => b[ordenarPor] - a[ordenarPor]).slice(0, limite);
}

export function resumirVentas(ventas, { inicio, fin, timezone, notas = [] }) {
  const grupo = agrupador(inicio, fin);

  // Serie continua: los periodos sin ventas aparecen en cero
  const serie = new Map();
  for (let t = new Date(inicio).getTime(); t <= new Date(fin).getTime(); t += DIA_MS) {
    const clave = grupo.clave(diaLocal(t, timezone));
    if (!serie.has(clave)) serie.set(clave, { periodo: clave, total: 0, transacciones: 0 });
  }
  const ultimaClave = grupo.clave(diaLocal(fin, timezone));
  if (!serie.has(ultimaClave)) serie.set(ultimaClave, { periodo: ultimaClave, total: 0, transacciones: 0 });

  const metodos = new Map();
  const productos = new Map();
  const clientes = new Map();
  let totalVentas = 0;

  for (const venta of ventas) {
    const total = Number(venta.total);
    totalVentas += total;

    const punto = serie.get(grupo.clave(diaLocal(venta.fecha, timezone)));
    if (punto) {
      punto.total += total;
      punto.transacciones += 1;
    }

    const metodo = venta.payment_method || "efectivo";
    const m = metodos.get(metodo) || { metodo, nombre: METODOS[metodo] || metodo, transacciones: 0, monto: 0 };
    m.transacciones += 1;
    m.monto += total;
    metodos.set(metodo, m);

    for (const item of venta.items || []) {
      const p = productos.get(item.nombre) || { nombre: item.nombre, cantidad: 0, ingreso: 0 };
      p.cantidad += Number(item.cantidad);
      p.ingreso += Number(item.subtotal);
      productos.set(item.nombre, p);
    }

    const nombreCliente = venta.cliente_nombre || venta.customer_name || "Mostrador";
    const c = clientes.get(nombreCliente) || { nombre: nombreCliente, compras: 0, total: 0 };
    c.compras += 1;
    c.total += total;
    clientes.set(nombreCliente, c);
  }

  return {
    totalVentas,
    // Notas credito del periodo (anulaciones y devoluciones)
    totalDevoluciones: notas.reduce((suma, nota) => suma + Number(nota.total), 0),
    totalNeto: totalVentas - notas.reduce((suma, nota) => suma + Number(nota.total), 0),
    notasCredito: notas.length,
    transacciones: ventas.length,
    ticketPromedio: ventas.length > 0 ? totalVentas / ventas.length : 0,
    agrupacion: grupo.tipo,
    serie: [...serie.values()],
    metodosPago: top(metodos, "monto", 10).map((m) => ({
      ...m,
      porcentaje: totalVentas > 0 ? (m.monto / totalVentas) * 100 : 0
    })),
    productosTop: top(productos, "cantidad", 10),
    clientesTop: top(clientes, "total", 10)
  };
}
