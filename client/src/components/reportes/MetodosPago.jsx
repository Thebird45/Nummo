import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer
} from "recharts";

function formatCop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

const COLORS = {
  efectivo: "#16a34a",
  transferencia: "#3b82f6",
  tarjeta: "#8b5cf6"
};

const LABELS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta"
};

export default function MetodosPago({ ventas, layout = "full" }) {
  const datos = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];

    const metodosMap = {
      efectivo: { transacciones: 0, monto: 0 },
      transferencia: { transacciones: 0, monto: 0 },
      tarjeta: { transacciones: 0, monto: 0 }
    };

    ventas.forEach((venta) => {
      const metodo = venta.payment_method || "efectivo";
      if (metodosMap[metodo]) {
        metodosMap[metodo].transacciones += 1;
        metodosMap[metodo].monto += Number(venta.total);
      }
    });

    const totalMonto = Object.values(metodosMap).reduce(
      (sum, m) => sum + m.monto,
      0
    );

    return Object.entries(metodosMap)
      .map(([metodo, data]) => ({
        name: LABELS[metodo],
        value: data.transacciones,
        monto: data.monto,
        porcentaje: totalMonto > 0 ? ((data.monto / totalMonto) * 100).toFixed(1) : 0,
        metodo
      }))
      .filter((item) => item.value > 0);
  }, [ventas]);

  if (datos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-slate-500 text-sm">Sin datos para mostrar</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg bg-white p-2 shadow-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-700">{data.name}</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: COLORS[data.metodo] }}>
            {formatCop(data.monto)}
          </p>
          <p className="text-xs text-slate-500">
            {data.porcentaje}% • {data.value} transacciones
          </p>
        </div>
      );
    }
    return null;
  };

  // Layout compacto: Pie + leyenda a la derecha
  if (layout === "compact") {
    return (
      <div className="flex items-center justify-between gap-4 h-full">
        {/* Pie Chart */}
        <div style={{ width: "50%", height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datos}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                paddingAngle={1}
                dataKey="monto"
              >
                {datos.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.metodo]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda a la derecha */}
        <div style={{ width: "50%" }} className="space-y-2">
          {datos.map((item) => (
            <div key={item.metodo} className="text-xs">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[item.metodo] }}
                />
                <p className="font-semibold text-slate-700">{item.name}</p>
              </div>
              <p className="font-bold text-slate-900 text-xs">{formatCop(item.monto)}</p>
              <p className="text-slate-500 text-xs">{item.porcentaje}%</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Layout full: Pie + leyenda debajo
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={datos}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            dataKey="monto"
          >
            {datos.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.metodo]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 w-full">
        {datos.map((item) => (
          <div key={item.metodo} className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS[item.metodo] }}
              />
              <p className="text-xs font-semibold text-slate-700">{item.name}</p>
            </div>
            <p className="text-sm font-bold text-slate-900">{formatCop(item.monto)}</p>
            <p className="text-xs text-slate-500">{item.porcentaje}% • {item.value} transacciones</p>
          </div>
        ))}
      </div>
    </div>
  );
}
