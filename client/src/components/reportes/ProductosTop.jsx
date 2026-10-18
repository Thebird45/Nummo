import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

function formatCop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function ProductosTop({ ventas }) {
  const datos = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];

    const productosMap = {};

    ventas.forEach((venta) => {
      venta.items.forEach((item) => {
        if (!productosMap[item.nombre]) {
          productosMap[item.nombre] = {
            nombre: item.nombre,
            cantidadVendida: 0,
            ingresoTotal: 0
          };
        }

        productosMap[item.nombre].cantidadVendida += Number(item.cantidad);
        productosMap[item.nombre].ingresoTotal += Number(item.subtotal);
      });
    });

    return Object.values(productosMap)
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        displayNombre: item.nombre.length > 15 ? item.nombre.substring(0, 15) + "..." : item.nombre
      }));
  }, [ventas]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg bg-white p-3 shadow-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-700">{data.nombre}</p>
          <p className="text-sm font-bold text-emerald-600 mt-1">
            {data.cantidadVendida} unidades
          </p>
          <p className="text-xs text-slate-500">
            Ingreso: {formatCop(data.ingresoTotal)}
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
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#94a3b8" style={{ fontSize: "12px" }} />
          <YAxis
            dataKey="displayNombre"
            type="category"
            stroke="#94a3b8"
            style={{ fontSize: "11px" }}
            width={195}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="cantidadVendida" fill="#16a34a" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
