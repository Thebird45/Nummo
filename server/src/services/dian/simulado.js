import crypto from "crypto";
import { env } from "../../config/env.js";
import { calcularCufe, datosCufe } from "./cufe.js";
import { validarFactura } from "./validaciones.js";

// Imita a un proveedor tecnologico: recibe, valida y responde "pendiente";
// la DIAN valida despues (env.dian.simSegundos) y se consulta con consultar()
const TIPO_AMBIENTE = "2";

export const proveedorSimulado = {
  nombre: "simulado",
  tipoAmbiente: TIPO_AMBIENTE,

  async enviar(factura) {
    const ahora = new Date().toISOString();
    const errores = validarFactura(factura.dian_payload);
    if (errores.length > 0) {
      return { status: "rechazada", cufe: null, trackId: null, respuesta: { mensajes: errores, rechazada_at: ahora } };
    }

    const cufe = calcularCufe(
      datosCufe(factura, {
        claveTecnica: factura.clave_tecnica || env.dian.claveTecnica,
        tipoAmbiente: TIPO_AMBIENTE,
        timezone: env.timezone
      })
    );
    return {
      status: "pendiente",
      cufe,
      trackId: crypto.randomUUID(),
      respuesta: { mensajes: ["Documento recibido, en validacion"], recibida_at: ahora }
    };
  },

  async consultar(factura) {
    const respuesta = factura.dian_respuesta || {};
    if (factura.status !== "pendiente" || !respuesta.recibida_at) {
      return { status: factura.status, respuesta };
    }

    const transcurrido = Date.now() - new Date(respuesta.recibida_at).getTime();
    if (transcurrido < env.dian.simSegundos * 1000) {
      return { status: "pendiente", respuesta };
    }

    return {
      status: "validada",
      respuesta: { ...respuesta, mensajes: ["Procesado correctamente"], validada_at: new Date().toISOString() }
    };
  }
};
