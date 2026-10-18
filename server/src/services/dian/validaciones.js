import { nitValido } from "./nit.js";

const centavos = (valor) => Math.round(Number(valor || 0) * 100);

// Reglas que la DIAN rechazaria; se revisan antes de enviar al proveedor
export function validarNotaCredito(payload) {
  const errores = validarFactura(payload);
  if (!payload.factura_referencia?.cufe) {
    errores.push("La nota credito debe referenciar una factura con CUFE");
  }
  if (!payload.motivo?.trim()) {
    errores.push("La nota credito debe indicar el motivo");
  }
  return errores;
}

export function validarFactura(payload) {
  const errores = [];
  const { emisor, cliente, items = [], subtotal, total_iva, total } = payload;

  if (!emisor?.nit) {
    errores.push("El emisor no tiene NIT");
  } else if (!nitValido(emisor.nit)) {
    errores.push(`NIT del emisor invalido (${emisor.nit}): revisa el digito de verificacion`);
  }

  if (!cliente?.documento) {
    errores.push("El adquirente no tiene documento");
  } else if (String(cliente.documento).includes("-") && !nitValido(cliente.documento)) {
    errores.push(`NIT del adquirente invalido (${cliente.documento}): revisa el digito de verificacion`);
  }

  if (items.length === 0) {
    errores.push("La factura no tiene productos");
  }

  const sumaItems = items.reduce((suma, item) => suma + centavos(item.subtotal), 0);
  if (items.length > 0 && sumaItems !== centavos(total)) {
    errores.push("La suma de los productos no coincide con el total");
  }

  if (subtotal === undefined || total_iva === undefined) {
    errores.push("La factura no tiene el desglose de IVA");
  } else if (centavos(subtotal) + centavos(total_iva) !== centavos(total)) {
    errores.push("Base mas IVA no coincide con el total");
  }

  return errores;
}
