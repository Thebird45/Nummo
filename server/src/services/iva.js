export const TARIFAS_IVA = [0, 5, 19];

// Los precios incluyen IVA: base = subtotal / (1 + tarifa). Se calcula en centavos para no perder pesos.
export function desglosarIva(items) {
  const impuestos = new Map();
  let baseTotal = 0;
  let ivaTotal = 0;

  const detalle = items.map((item) => {
    const tarifa = Number(item.iva_tarifa);
    const subtotalCentavos = Math.round(Number(item.subtotal) * 100);
    const baseCentavos = Math.round(subtotalCentavos / (1 + tarifa / 100));
    const ivaCentavos = subtotalCentavos - baseCentavos;

    const acumulado = impuestos.get(tarifa) || { base: 0, iva: 0 };
    impuestos.set(tarifa, { base: acumulado.base + baseCentavos, iva: acumulado.iva + ivaCentavos });
    baseTotal += baseCentavos;
    ivaTotal += ivaCentavos;

    return { ...item, iva_tarifa: tarifa, base: baseCentavos / 100, iva: ivaCentavos / 100 };
  });

  return {
    items: detalle,
    subtotal: baseTotal / 100,
    total_iva: ivaTotal / 100,
    impuestos: [...impuestos.entries()]
      .sort(([a], [b]) => b - a)
      .map(([tarifa, { base, iva }]) => ({ tarifa, base: base / 100, iva: iva / 100 }))
  };
}
