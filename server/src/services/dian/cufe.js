import crypto from "crypto";
import { separarNit } from "./nit.js";

const dosDecimales = (valor) => Number(valor || 0).toFixed(2);

// CUFE segun el Anexo Tecnico 1.9 (seccion 11.2): SHA-384 de los campos concatenados
export function calcularCufe({
  numFac,
  fecFac,
  horFac,
  valFac,
  valIva,
  valInc = 0,
  valIca = 0,
  valTot,
  nitOfe,
  numAdq,
  claveTecnica,
  tipoAmbiente
}) {
  const cadena = [
    numFac,
    fecFac,
    horFac,
    dosDecimales(valFac),
    "01",
    dosDecimales(valIva),
    "04",
    dosDecimales(valInc),
    "03",
    dosDecimales(valIca),
    dosDecimales(valTot),
    nitOfe,
    numAdq,
    claveTecnica,
    tipoAmbiente
  ].join("");

  return crypto.createHash("sha384").update(cadena).digest("hex");
}

// Fecha "2026-10-17" y hora "22:30:00-05:00" en la zona del negocio
export function fechaHoraDian(fecha, timezone) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "longOffset"
    })
      .formatToParts(new Date(fecha))
      .map((p) => [p.type, p.value])
  );
  const offset = partes.timeZoneName === "GMT" ? "+00:00" : partes.timeZoneName.replace("GMT", "");
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}:${partes.second}${offset}`
  };
}

// Campos del CUFE a partir de una factura de Nummo
export function datosCufe(factura, { claveTecnica, tipoAmbiente, timezone }) {
  const { emisor, cliente, subtotal, total_iva, total } = factura.dian_payload;
  const { fecha, hora } = fechaHoraDian(factura.created_at, timezone);
  return {
    numFac: `${factura.prefijo}${factura.numero}`,
    fecFac: fecha,
    horFac: hora,
    valFac: subtotal,
    valIva: total_iva,
    valTot: total,
    nitOfe: separarNit(emisor.nit).numero,
    numAdq: separarNit(cliente.documento).numero,
    claveTecnica,
    tipoAmbiente
  };
}

const CATALOGO = {
  1: "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=",
  2: "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey="
};

// Texto del QR: datos minimos de la factura y enlace de consulta en la DIAN
export function contenidoQr(factura, datos, cufe) {
  return [
    `NumFac: ${datos.numFac}`,
    `FecFac: ${datos.fecFac}`,
    `HorFac: ${datos.horFac}`,
    `NitFac: ${datos.nitOfe}`,
    `DocAdq: ${datos.numAdq}`,
    `ValFac: ${dosDecimales(datos.valFac)}`,
    `ValIva: ${dosDecimales(datos.valIva)}`,
    "ValOtroIm: 0.00",
    `ValTolFac: ${dosDecimales(datos.valTot)}`,
    `CUFE: ${cufe}`,
    `QRCode: ${CATALOGO[datos.tipoAmbiente] || CATALOGO[2]}${cufe}`
  ].join("\n");
}
