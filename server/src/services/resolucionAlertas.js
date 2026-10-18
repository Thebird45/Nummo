const DIAS_AVISO = 30;

// Avisos para que el negocio pida una nueva resolucion a tiempo
export function alertasResolucion(resolucion) {
  if (!resolucion) {
    return [{ nivel: "error", mensaje: "Configura la resolucion de facturacion de la DIAN para poder facturar" }];
  }

  const alertas = [];
  const { vigente, dias_para_vencer: dias, disponibles, total } = resolucion;

  if (!vigente && dias < 0) {
    alertas.push({ nivel: "error", mensaje: `La resolucion vencio el ${resolucion.vigencia_hasta}` });
  } else if (!vigente) {
    alertas.push({ nivel: "error", mensaje: `La resolucion empieza a regir el ${resolucion.vigencia_desde}` });
  } else if (dias <= DIAS_AVISO) {
    alertas.push({ nivel: "aviso", mensaje: `La resolucion vence en ${dias} dia${dias === 1 ? "" : "s"} (${resolucion.vigencia_hasta})` });
  }

  if (disponibles === 0) {
    alertas.push({ nivel: "error", mensaje: "Se agoto el rango de numeracion autorizado" });
  } else if (disponibles <= Math.max(10, Math.ceil(total * 0.1))) {
    alertas.push({ nivel: "aviso", mensaje: `Quedan ${disponibles} numeros del rango autorizado` });
  }

  return alertas;
}
