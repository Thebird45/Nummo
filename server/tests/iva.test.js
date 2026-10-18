import { describe, expect, it } from "vitest";
import { desglosarIva } from "../src/services/iva.js";

describe("desglosarIva", () => {
  it("separa base e IVA de un precio con IVA incluido", () => {
    const { items, subtotal, total_iva } = desglosarIva([{ subtotal: 11900, iva_tarifa: 19 }]);
    expect(items[0]).toMatchObject({ base: 10000, iva: 1900 });
    expect(subtotal).toBe(10000);
    expect(total_iva).toBe(1900);
  });

  it("base + IVA siempre suma el total exacto", () => {
    const { items } = desglosarIva([{ subtotal: 3200, iva_tarifa: 19 }]);
    expect(items[0].base).toBe(2689.08);
    expect(items[0].iva).toBe(510.92);
    expect(items[0].base + items[0].iva).toBeCloseTo(3200, 10);
  });

  it("agrupa por tarifa, de mayor a menor, y respeta tarifa 0", () => {
    const { impuestos, subtotal, total_iva } = desglosarIva([
      { subtotal: 1050, iva_tarifa: 5 },
      { subtotal: 2380, iva_tarifa: 19 },
      { subtotal: 500, iva_tarifa: 0 },
      { subtotal: 1190, iva_tarifa: 19 }
    ]);
    expect(impuestos).toEqual([
      { tarifa: 19, base: 3000, iva: 570 },
      { tarifa: 5, base: 1000, iva: 50 },
      { tarifa: 0, base: 500, iva: 0 }
    ]);
    expect(subtotal).toBe(4500);
    expect(total_iva).toBe(620);
  });
});
