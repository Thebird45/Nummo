const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

// Digito de verificacion del NIT (modulo 11 de la DIAN)
export function digitoVerificacion(numero) {
  const digitos = String(numero).split("").reverse();
  const suma = digitos.reduce((total, digito, i) => total + Number(digito) * PESOS[i], 0);
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

// "901.234.567-7" -> { numero: "901234567", dv: 7 }; sin guion dv es null
export function separarNit(documento) {
  const limpio = String(documento || "").replace(/[.\s]/g, "");
  const [numero, dv] = limpio.split("-");
  return { numero, dv: dv === undefined || dv === "" ? null : Number(dv) };
}

// Mensaje para el usuario si el NIT no es valido; null si esta bien
export function errorNit(documento) {
  if (nitValido(documento)) return null;
  const { numero } = separarNit(documento);
  if (!/^\d{5,15}$/.test(numero)) return "El NIT o documento debe tener solo numeros";
  return `NIT invalido: el digito de verificacion de ${numero} es ${digitoVerificacion(numero)}`;
}

export function nitValido(documento) {
  const { numero, dv } = separarNit(documento);
  if (!/^\d{5,15}$/.test(numero)) return false;
  return dv === null || digitoVerificacion(numero) === dv;
}
