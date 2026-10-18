import React, { useMemo, useState } from "react";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";

const METODOS_COLORES = {
  efectivo: { bg: "bg-emerald-100", texto: "text-emerald-700" },
  transferencia: { bg: "bg-blue-100", texto: "text-blue-700" },
  tarjeta: { bg: "bg-purple-100", texto: "text-purple-700" }
};

const METODOS_LABELS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta"
};

function formatCop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatFecha(fecha) {
  const date = new Date(fecha);
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function TablaVentas({ ventas, limite = null }) {
  const [paginaActual, setPaginaActual] = useState(0);
  const itemsPorPagina = 10;

  const ventasOrdenadas = useMemo(() => {
    if (!ventas) return [];
    return [...ventas].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );
  }, [ventas]);

  // Si hay límite, mostrar solo esas rows sin paginación
  const mostrarLimitado = limite !== null && limite > 0;
  const ventasAMostrar = mostrarLimitado
    ? ventasOrdenadas.slice(0, limite)
    : ventasOrdenadas.slice(
        paginaActual * itemsPorPagina,
        (paginaActual + 1) * itemsPorPagina
      );

  const totalPaginas = Math.ceil(ventasOrdenadas.length / itemsPorPagina);

  const exportarCSV = () => {
    const headers = ["Fecha", "Cliente", "Productos", "Método de Pago", "Total"];
    const filas = ventasOrdenadas.map((venta) => [
      formatFecha(venta.fecha),
      venta.customer_name || "Mostrador",
      venta.items.map((item) => item.nombre).join(", "),
      METODOS_LABELS[venta.payment_method] || venta.payment_method,
      venta.total
    ]);

    const csv = [
      headers.join(","),
      ...filas.map((fila) =>
        fila
          .map((cell) =>
            typeof cell === "string" && cell.includes(",")
              ? `"${cell}"`
              : cell
          )
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ventas_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (ventasOrdenadas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-slate-500">Sin ventas en este período</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">
          {mostrarLimitado ? "Ventas recientes" : "Todas las ventas"}
        </h3>
        {!mostrarLimitado && (
          <button
            onClick={exportarCSV}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 text-slate-700 px-2 py-1.5 text-xs font-semibold hover:bg-slate-200 transition"
          >
            <Download size={14} />
            CSV
          </button>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Fecha</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Cliente</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Productos</th>
              <th className="px-4 py-2 text-center font-semibold text-slate-700">Método</th>
              <th className="px-4 py-2 text-right font-semibold text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {ventasAMostrar.map((venta) => {
              const metodoPago = venta.payment_method || "efectivo";
              const colores = METODOS_COLORES[metodoPago];

              return (
                <tr
                  key={venta.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="px-4 py-2 text-slate-900 font-medium whitespace-nowrap">
                    {formatFecha(venta.fecha)}
                  </td>
                  <td className="px-4 py-2 text-slate-700 truncate">
                    {venta.customer_name || "Mostrador"}
                  </td>
                  <td className="px-4 py-2 text-slate-600 truncate">
                    {venta.items.map((item) => item.nombre).join(", ")}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        colores.bg
                      } ${colores.texto}`}
                    >
                      {METODOS_LABELS[metodoPago] || metodoPago}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">
                    {formatCop(venta.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!mostrarLimitado && totalPaginas > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <p className="text-xs text-slate-600">
            Página {paginaActual + 1} de {totalPaginas}
          </p>

          <div className="flex gap-1">
            <button
              onClick={() => setPaginaActual(Math.max(0, paginaActual - 1))}
              disabled={paginaActual === 0}
              className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(5, totalPaginas) }).map((_, i) => {
              const pageNum = i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPaginaActual(pageNum)}
                  className={`rounded px-2 py-1 text-xs font-semibold transition ${
                    paginaActual === pageNum
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}

            <button
              onClick={() => setPaginaActual(Math.min(totalPaginas - 1, paginaActual + 1))}
              disabled={paginaActual === totalPaginas - 1}
              className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
