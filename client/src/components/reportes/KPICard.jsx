import React from "react";

export default function KPICard({
  ícono: Icon,
  label,
  valor,
  variación,
  esPositivo = true,
  colorIcon = "text-emerald-600"
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{valor}</p>

          {variación && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`inline-block text-xs font-semibold ${
                  esPositivo
                    ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"
                    : "text-red-600 bg-red-50 px-2 py-0.5 rounded"
                }`}
              >
                {esPositivo ? "+" : ""}
                {variación}
              </span>
              <span className="text-xs text-slate-500">vs período anterior</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`rounded-lg bg-emerald-50/50 p-3 ${colorIcon}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
