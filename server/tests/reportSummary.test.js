import { describe, expect, it } from "vitest";
import { resumirVentas } from "../src/services/reportSummary.js";

const TZ = "America/Bogota";
const item = (nombre, cantidad, subtotal) => ({ nombre, cantidad, subtotal });

describe("resumirVentas", () => {
  const ventas = [
    // 17 oct 10:30 p. m. en Bogota (ya es 18 oct en UTC)
    { fecha: "2026-10-18T03:30:00Z", total: 9000, payment_method: "efectivo", cliente_nombre: "Laura", items: [item("Arepa", 2, 9000)] },
    { fecha: "2026-10-18T15:00:00Z", total: 6000, payment_method: "transferencia", customer_name: "Cliente de mostrador", items: [item("Gaseosa", 2, 6000)] },
    { fecha: "2026-10-18T16:00:00Z", total: 7500, payment_method: "efectivo", cliente_nombre: "Laura", items: [item("Arepa", 1, 4500), item("Gaseosa", 1, 3000)] }
  ];
  const rango = { inicio: "2026-10-16T05:00:00Z", fin: "2026-10-19T04:59:59Z", timezone: TZ };

  it("calcula totales y ticket promedio", () => {
    const r = resumirVentas(ventas, rango);
    expect(r.totalVentas).toBe(22500);
    expect(r.transacciones).toBe(3);
    expect(r.ticketPromedio).toBe(7500);
  });

  it("agrupa por dia de Colombia y rellena dias sin ventas", () => {
    const r = resumirVentas(ventas, rango);
    expect(r.agrupacion).toBe("dia");
    expect(r.serie).toEqual([
      { periodo: "2026-10-16", total: 0, transacciones: 0 },
      { periodo: "2026-10-17", total: 9000, transacciones: 1 },
      { periodo: "2026-10-18", total: 13500, transacciones: 2 }
    ]);
  });

  it("ordena productos por cantidad, clientes por total y metodos por monto", () => {
    const r = resumirVentas(ventas, rango);
    expect(r.productosTop).toEqual([
      { nombre: "Arepa", cantidad: 3, ingreso: 13500 },
      { nombre: "Gaseosa", cantidad: 3, ingreso: 9000 }
    ]);
    expect(r.clientesTop[0]).toEqual({ nombre: "Laura", compras: 2, total: 16500 });
    expect(r.metodosPago.map((m) => [m.nombre, m.monto])).toEqual([["Efectivo", 16500], ["Transferencia", 6000]]);
    expect(r.metodosPago[0].porcentaje).toBeCloseTo(73.33, 2);
  });

  it("usa semanas o meses en periodos largos", () => {
    const semanas = resumirVentas([], { inicio: "2026-09-01T05:00:00Z", fin: "2026-10-31T04:59:59Z", timezone: TZ });
    expect(semanas.agrupacion).toBe("semana");
    expect(semanas.serie[0].periodo).toBe("2026-08-31");

    const meses = resumirVentas([], { inicio: "2026-01-01T05:00:00Z", fin: "2026-12-31T04:59:59Z", timezone: TZ });
    expect(meses.agrupacion).toBe("mes");
    expect(meses.serie).toHaveLength(12);
  });

  it("sin ventas devuelve ceros", () => {
    const r = resumirVentas([], rango);
    expect(r.totalVentas).toBe(0);
    expect(r.ticketPromedio).toBe(0);
    expect(r.productosTop).toEqual([]);
  });
});
