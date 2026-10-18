import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FiltrosPeriodo({ periodoActual, onPeriodoChange }) {
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const periodos = [
    { id: "hoy", label: "Hoy" },
    { id: "esta-semana", label: "Esta semana" },
    { id: "este-mes", label: "Este mes" },
    { id: "este-año", label: "Este año" },
    { id: "personalizado", label: "Personalizado" }
  ];

  const handlePeriodoClick = (periodoId) => {
    if (periodoId === "personalizado") {
      setMostrarPersonalizado(true);
    } else {
      setMostrarPersonalizado(false);
      onPeriodoChange({ tipo: periodoId });
    }
  };

  const handleAplicarPersonalizado = () => {
    if (fechaInicio && fechaFin) {
      onPeriodoChange({
        tipo: "personalizado",
        fechaInicio,
        fechaFin
      });
      setMostrarPersonalizado(false);
    }
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {periodos.map((periodo) => (
          <button
            key={periodo.id}
            onClick={() => handlePeriodoClick(periodo.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              periodoActual?.tipo === periodo.id
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {periodo.label}
          </button>
        ))}
      </div>

      {mostrarPersonalizado && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Selecciona rango de fechas</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAplicarPersonalizado}
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 transition"
              >
                Aplicar
              </button>
              <button
                onClick={() => setMostrarPersonalizado(false)}
                className="rounded-lg bg-slate-200 text-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
