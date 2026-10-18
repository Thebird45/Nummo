import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

function formatCop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function GraficaVentas({ ventas }) {
  const datos = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];

    // Agrupar por día
    const porDia = {};

    ventas.forEach((venta) => {
      const fecha = new Date(venta.fecha);
      const dia = fecha.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!porDia[dia]) {
        porDia[dia] = {
          fecha: dia,
          total: 0,
          transacciones: 0,
          displayFecha: fecha.toLocaleDateString("es-CO", {
            month: "short",
            day: "numeric"
          })
        };
      }

      porDia[dia].total += Number(venta.total);
      porDia[dia].transacciones += 1;
    });

    return Object.values(porDia).sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha)
    );
  }, [ventas]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg bg-white p-3 shadow-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-700">{data.fecha}</p>
          <p className="text-sm font-bold text-emerald-600 mt-1">
            {formatCop(data.total)}
          </p>
          <p className="text-xs text-slate-500">
            {data.transacciones} transacción{data.transacciones > 1 ? "es" : ""}
          </p>
        </div>
      );
    }
    return null;
  };

  if (datos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <p className="text-slate-500 text-sm">Sin datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="displayFecha"
            stroke="#94a3b8"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: "12px" }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#16a34a"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
