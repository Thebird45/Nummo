import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  DollarSign,
  Download,
  Package,
  ShoppingCart,
  TrendingUp
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import KPICard from "../components/reportes/KPICard";
import FiltrosPeriodo from "../components/reportes/FiltrosPeriodo";
import GraficaVentas from "../components/reportes/GraficaVentas";
import ProductosTop from "../components/reportes/ProductosTop";
import MetodosPago from "../components/reportes/MetodosPago";
import { api } from "../services/api";
import { descargarPdf, mensajeDeError } from "../services/descargas";

function formatCop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function obtenerRangoPeriodo(tipo, fechaInicio = null, fechaFin = null) {
  const hoy = new Date();
  const hace90Dias = new Date(hoy);
  hace90Dias.setDate(hace90Dias.getDate() - 90);

  let inicio;
  let fin;

  switch (tipo) {
    case "hoy":
      inicio = new Date(hoy);
      inicio.setHours(0, 0, 0, 0);
      fin = new Date(hoy);
      fin.setHours(23, 59, 59, 999);
      break;
    case "esta-semana": {
      const diasAlInicio = hoy.getDay();
      inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - diasAlInicio);
      inicio.setHours(0, 0, 0, 0);
      fin = new Date(hoy);
      fin.setHours(23, 59, 59, 999);
      break;
    }
    case "este-mes":
      inicio = new Date(hoy);
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      fin = new Date(hoy);
      fin.setHours(23, 59, 59, 999);
      break;
    case "este-año":
      inicio = new Date(hoy);
      inicio.setMonth(0);
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      fin = new Date(hoy);
      fin.setHours(23, 59, 59, 999);
      break;
    case "personalizado":
      if (fechaInicio && fechaFin) {
        inicio = new Date(fechaInicio);
        inicio.setHours(0, 0, 0, 0);
        fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999);
      } else {
        inicio = hace90Dias;
        fin = hoy;
      }
      break;
    default:
      inicio = hace90Dias;
      fin = hoy;
  }

  return { inicio, fin };
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

export default function ReportesPage() {
  const [periodoActual, setPeriodoActual] = useState({ tipo: "este-mes" });
  const [ventasFiltradas, setVentasFiltradas] = useState([]);
  const [ventasAnterior, setVentasAnterior] = useState([]);
  const [tabActivo, setTabActivo] = useState("resumen");
  const [metodoPagoFiltro, setMetodoPagoFiltro] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [errorFetch, setErrorFetch] = useState("");
  const [exportando, setExportando] = useState(false);
  const [notasCredito, setNotasCredito] = useState([]);
  const [errorPdf, setErrorPdf] = useState("");

  const onLogout = () => {
    localStorage.removeItem("nummo_token");
    window.location.href = "/login";
  };

  useEffect(() => {
    const rango = obtenerRangoPeriodo(
      periodoActual.tipo,
      periodoActual.fechaInicio,
      periodoActual.fechaFin
    );

    const diasDiferencia = Math.floor((rango.fin - rango.inicio) / (1000 * 60 * 60 * 24));
    const inicioAnterior = new Date(rango.inicio);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasDiferencia - 1);
    const finAnterior = new Date(rango.inicio);
    finAnterior.setDate(finAnterior.getDate() - 1);

    setLoading(true);
    setErrorFetch("");

    Promise.all([
      api.get(`/reportes?inicio=${rango.inicio.toISOString()}&fin=${rango.fin.toISOString()}`),
      api.get(`/reportes?inicio=${inicioAnterior.toISOString()}&fin=${finAnterior.toISOString()}`)
    ])
      .then(([respActual, respAnterior]) => {
        setVentasFiltradas(respActual.data.ventas || []);
        setNotasCredito(respActual.data.notas_credito || []);
        setVentasAnterior(respAnterior.data.ventas || []);
      })
      .catch((err) => {
        setErrorFetch(err.response?.data?.message || "No se pudieron cargar los reportes");
      })
      .finally(() => setLoading(false));
  }, [periodoActual]);

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

  const ventasFiltrosFinal = useMemo(() => {
    if (metodoPagoFiltro === "todos") return ventasFiltradas;
    return ventasFiltradas.filter((v) => v.payment_method === metodoPagoFiltro);
  }, [ventasFiltradas, metodoPagoFiltro]);

  const productosMasVendidos = useMemo(() => {
    const productosMap = {};

    ventasFiltradas.forEach((venta) => {
      (venta.items || []).forEach((item) => {
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

    const totalIngresos = Object.values(productosMap).reduce((sum, p) => sum + p.ingresoTotal, 0);

    return Object.values(productosMap)
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .map((p) => ({
        ...p,
        porcentaje: totalIngresos > 0 ? ((p.ingresoTotal / totalIngresos) * 100).toFixed(1) : 0
      }));
  }, [ventasFiltradas]);

  const metodosPagoStats = useMemo(() => {
    const metodosMap = {
      efectivo: { transacciones: 0, monto: 0 },
      transferencia: { transacciones: 0, monto: 0 },
      tarjeta: { transacciones: 0, monto: 0 }
    };

    ventasFiltradas.forEach((venta) => {
      const metodo = venta.payment_method || "efectivo";
      if (metodosMap[metodo]) {
        metodosMap[metodo].transacciones += 1;
        metodosMap[metodo].monto += Number(venta.total);
      }
    });

    const totalMonto = Object.values(metodosMap).reduce((sum, m) => sum + m.monto, 0);

    return Object.entries(metodosMap)
      .map(([metodo, data]) => ({
        name: METODOS_LABELS[metodo],
        metodo,
        transacciones: data.transacciones,
        monto: data.monto,
        porcentaje: totalMonto > 0 ? ((data.monto / totalMonto) * 100).toFixed(1) : 0
      }))
      .filter((item) => item.transacciones > 0);
  }, [ventasFiltradas]);

  const clientesFrecuentes = useMemo(() => {
    const clientesMap = {};

    ventasFiltradas.forEach((venta) => {
      const cliente = venta.customer_name || "Mostrador";
      if (!clientesMap[cliente]) {
        clientesMap[cliente] = {
          nombre: cliente,
          compras: 0,
          total: 0,
          ultimaVisita: null
        };
      }

      clientesMap[cliente].compras += 1;
      clientesMap[cliente].total += Number(venta.total);
      clientesMap[cliente].ultimaVisita = venta.fecha;
    });

    return Object.values(clientesMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [ventasFiltradas]);

  const kpis = useMemo(() => {
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + Number(v.total), 0);
    const totalTransacciones = ventasFiltradas.length;
    const ticketPromedio = totalTransacciones > 0 ? totalVentas / totalTransacciones : 0;

    const productosMapa = {};
    ventasFiltradas.forEach((venta) => {
      (venta.items || []).forEach((item) => {
        if (!productosMapa[item.nombre]) {
          productosMapa[item.nombre] = { nombre: item.nombre, cantidad: 0 };
        }
        productosMapa[item.nombre].cantidad += Number(item.cantidad);
      });
    });

    const productoMasVendido =
      Object.values(productosMapa).length > 0
        ? Object.values(productosMapa).sort((a, b) => b.cantidad - a.cantidad)[0].nombre
        : "N/A";

    const totalVentasAnterior = ventasAnterior.reduce((sum, v) => sum + Number(v.total), 0);
    const variacion =
      totalVentasAnterior > 0
        ? (((totalVentas - totalVentasAnterior) / totalVentasAnterior) * 100).toFixed(1)
        : 0;

    return {
      totalVentas,
      totalTransacciones,
      ticketPromedio,
      productoMasVendido,
      variacion,
      esPositivo: Number(variacion) >= 0
    };
  }, [ventasFiltradas, ventasAnterior]);

  const exportarCSV = () => {
    const headers = ["Fecha", "Cliente", "Productos", "Método de Pago", "Total"];
    const filas = ventasFiltrosFinal.map((venta) => [
      formatFecha(venta.fecha),
      venta.customer_name || "Mostrador",
      (venta.items || []).map((item) => item.nombre).join(", "),
      METODOS_LABELS[venta.payment_method] || venta.payment_method,
      venta.total
    ]);

    const csv = [
      headers.join(","),
      ...filas.map((fila) =>
        fila
          .map((cell) => (typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell))
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ventas_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportarPDF = async () => {
    const { inicio, fin } = obtenerRangoPeriodo(
      periodoActual.tipo,
      periodoActual.fechaInicio,
      periodoActual.fechaFin
    );
    const dia = (fecha) => fecha.toLocaleDateString("en-CA");
    setErrorPdf("");
    setExportando(true);
    try {
      await descargarPdf("/reportes/pdf", `reporte-ventas-${dia(inicio)}_${dia(fin)}.pdf`, {
        inicio: inicio.toISOString(),
        fin: fin.toISOString()
      });
    } catch (err) {
      setErrorPdf(await mensajeDeError(err, "No se pudo generar el PDF"));
    } finally {
      setExportando(false);
    }
  };

  const showFallbackState = loading || errorFetch || ventasFiltradas.length === 0;

  if (showFallbackState) {
    return (
      <main className="min-h-screen bg-slate-50 md:flex">
        <Sidebar onLogout={onLogout} />

        <section className="flex-1 p-6 md:p-8">
          <header className="mb-6 rounded-2xl bg-brand-950 p-6 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-2">
                <TrendingUp size={28} className="text-purple-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Reportes</p>
                <h2 className="text-3xl font-bold">Análisis de ventas</h2>
              </div>
            </div>
          </header>

          <FiltrosPeriodo periodoActual={periodoActual} onPeriodoChange={setPeriodoActual} />

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
            {loading && (
              <>
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                <p className="text-sm text-slate-500">Cargando reportes...</p>
              </>
            )}
            {!loading && errorFetch && (
              <>
                <AlertTriangle size={48} className="mx-auto text-red-300 mb-3" />
                <p className="text-red-600 font-medium">{errorFetch}</p>
              </>
            )}
            {!loading && !errorFetch && (
              <>
                <AlertTriangle size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Sin ventas en este período</p>
                <p className="text-slate-400 text-sm mt-1">Prueba seleccionando un rango más amplio</p>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 md:flex">
      <Sidebar onLogout={onLogout} />

      <section className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden max-h-screen">
        <header className="mb-6 rounded-2xl bg-brand-950 p-6 text-white shadow-lg flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <TrendingUp size={28} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Reportes</p>
              <h2 className="text-3xl font-bold">Análisis de ventas</h2>
            </div>
            <button
              onClick={exportarPDF}
              disabled={exportando}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download size={16} />
              {exportando ? "Generando..." : "Exportar PDF"}
            </button>
          </div>
          <p className="mt-3 text-sm text-brand-200">
            Visualiza métricas, gráficas y detalles de todas tus ventas.
          </p>
          {errorPdf && <p className="mt-2 text-sm text-red-300">{errorPdf}</p>}
        </header>

        <div className="mb-4 flex-shrink-0">
          <FiltrosPeriodo periodoActual={periodoActual} onPeriodoChange={setPeriodoActual} />
        </div>

        {notasCredito.length > 0 && (
          <div className="mb-4 flex-shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            Devoluciones ({notasCredito.length} nota{notasCredito.length === 1 ? "" : "s"} credito):{" "}
            <span className="font-semibold text-red-600">
              -{formatCop(notasCredito.reduce((suma, n) => suma + Number(n.total), 0))}
            </span>
            {" · "}Total neto:{" "}
            <span className="font-semibold text-slate-900">
              {formatCop(kpis.totalVentas - notasCredito.reduce((suma, n) => suma + Number(n.total), 0))}
            </span>
          </div>
        )}

        <div className="mb-4 flex-shrink-0 border-b border-slate-200">
          <div className="flex gap-1">
            {[
              { id: "resumen", label: "Resumen" },
              { id: "ventas", label: "Ventas" },
              { id: "productos", label: "Productos" },
              { id: "pagos", label: "Pagos" },
              { id: "clientes", label: "Clientes" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                  tabActivo === tab.id
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tabActivo === "resumen" && (
            <div className="space-y-6 pb-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  ícono={DollarSign}
                  label="Total ventas"
                  valor={formatCop(kpis.totalVentas)}
                  variación={`${kpis.variacion}%`}
                  esPositivo={kpis.esPositivo}
                  colorIcon="text-emerald-600"
                />
                <KPICard
                  ícono={ShoppingCart}
                  label="Transacciones"
                  valor={kpis.totalTransacciones.toLocaleString()}
                  colorIcon="text-blue-600"
                />
                <KPICard
                  ícono={DollarSign}
                  label="Ticket promedio"
                  valor={formatCop(kpis.ticketPromedio)}
                  colorIcon="text-purple-600"
                />
                <KPICard
                  ícono={Package}
                  label="Producto top"
                  valor={kpis.productoMasVendido}
                  colorIcon="text-orange-600"
                />
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Ingresos por período</h3>
                  <div style={{ height: "220px" }}>
                    <GraficaVentas ventas={ventasFiltradas} />
                  </div>
                </div>

                <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Productos más vendidos</h3>
                  <div style={{ height: "220px" }}>
                    <ProductosTop ventas={ventasFiltradas} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tabActivo === "ventas" && (
            <div className="space-y-4 pb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Filtro:</span>
                  <div className="flex gap-2">
                    {["todos", "efectivo", "transferencia", "tarjeta"].map((metodo) => (
                      <button
                        key={metodo}
                        onClick={() => setMetodoPagoFiltro(metodo)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                          metodoPagoFiltro === metodo
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {metodo === "todos" ? "Todos" : METODOS_LABELS[metodo]}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={exportarCSV}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200 transition"
                >
                  <Download size={14} />
                  Descargar CSV
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Fecha</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Cliente</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Productos</th>
                        <th className="px-4 py-2 text-center font-semibold text-slate-700">Método</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasFiltrosFinal.slice(0, 10).map((venta) => {
                        const metodoPago = venta.payment_method || "efectivo";
                        const colores = METODOS_COLORES[metodoPago];

                        return (
                          <tr key={venta.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td className="px-4 py-2 text-slate-900 font-medium whitespace-nowrap">
                              {formatFecha(venta.fecha)}
                            </td>
                            <td className="px-4 py-2 text-slate-700 truncate">
                              {venta.customer_name || "Mostrador"}
                            </td>
                            <td className="px-4 py-2 text-slate-600 truncate">
                              {(venta.items || []).map((item) => item.nombre).join(", ")}
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
                {ventasFiltrosFinal.length > 10 && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                    Mostrando 10 de {ventasFiltrosFinal.length} ventas
                  </div>
                )}
              </div>
            </div>
          )}

          {tabActivo === "productos" && (
            <div className="space-y-6 pb-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Top productos</h3>
                <div style={{ height: "300px" }}>
                  <ProductosTop ventas={ventasFiltradas} />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Detalle de productos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">Producto</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">Unidades</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">Ingreso total</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">% del total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosMasVendidos.map((producto) => (
                        <tr key={producto.nombre} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-4 py-2 text-slate-900 font-medium">{producto.nombre}</td>
                          <td className="px-4 py-2 text-right text-slate-700">{producto.cantidadVendida}</td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-600">
                            {formatCop(producto.ingresoTotal)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">
                              {producto.porcentaje}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActivo === "pagos" && (
            <div className="space-y-6 pb-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Distribución por método</h3>
                <div style={{ height: "250px" }} className="flex items-center justify-center">
                  <MetodosPago ventas={ventasFiltradas} layout="compact" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {metodosPagoStats.map((metodo) => (
                  <div key={metodo.metodo} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            metodo.metodo === "efectivo"
                              ? "#16a34a"
                              : metodo.metodo === "transferencia"
                                ? "#3b82f6"
                                : "#8b5cf6"
                        }}
                      />
                      <p className="text-sm font-semibold text-slate-700">{metodo.name}</p>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{formatCop(metodo.monto)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {metodo.transacciones} transacciones · {metodo.porcentaje}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tabActivo === "clientes" && (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden pb-6">
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">Top 10 clientes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Cliente</th>
                      <th className="px-4 py-2 text-right font-semibold text-slate-700"># Compras</th>
                      <th className="px-4 py-2 text-right font-semibold text-slate-700">Total gastado</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-700">Última visita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFrecuentes.map((cliente) => (
                      <tr key={cliente.nombre} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="px-4 py-2 text-slate-900 font-medium">{cliente.nombre}</td>
                        <td className="px-4 py-2 text-right text-slate-700">{cliente.compras}</td>
                        <td className="px-4 py-2 text-right font-bold text-emerald-600">
                          {formatCop(cliente.total)}
                        </td>
                        <td className="px-4 py-2 text-slate-600 text-xs">{formatFecha(cliente.ultimaVisita)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
