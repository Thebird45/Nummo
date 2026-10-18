import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const estilos = {
  error: "bg-red-50 border-red-200 text-red-700",
  aviso: "bg-amber-50 border-amber-200 text-amber-800"
};

export default function AlertasResolucion({ alertas, enlace = false }) {
  if (!alertas?.length) return null;
  return (
    <div className="mb-4 space-y-2">
      {alertas.map((alerta) => (
        <div
          key={alerta.mensaje}
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${estilos[alerta.nivel] || estilos.aviso}`}
        >
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="flex-1">{alerta.mensaje}</span>
          {enlace && (
            <Link to="/configuracion" className="font-semibold underline">
              Configurar
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
