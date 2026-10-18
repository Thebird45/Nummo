import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, DollarSign, FileCheck, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import { fetchDashboard } from "../services/dashboard";
import PlaceholderPage from "./PlaceholderPage";

function formatCop(value) {
  const amount = Number(value || 0);
  return `$ ${new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)}`;
}

const dayLabelMap = {
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mie",
  Thu: "Jue",
  Fri: "Vie",
  Sat: "Sab",
  Sun: "Dom",
  Lun: "Lun",
  Mar: "Mar",
  Mie: "Mie",
  Jue: "Jue",
  Vie: "Vie",
  Sab: "Sab",
  Dom: "Dom"
};

function toSpanishDay(value) {
  const clean = String(value || "").replace(".", "").trim();
  const mapped = dayLabelMap[clean] || clean;
  if (mapped === "Mie") return "Mié";
  if (mapped === "Sab") return "Sáb";
  return mapped;
}

export default function DashboardPage({ section = "dashboard" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (section !== "dashboard") return;

    const load = async () => {
      try {
        const response = await fetchDashboard();
        setData(response);
      } catch (apiError) {
        setError(apiError.response?.data?.message || "No se pudo cargar el dashboard");
      }
    };

    load();
  }, [section]);

  const titleMap = useMemo(
    () => ({
      inventario: ["Inventario", "CRUD de productos, alertas de stock e historial de movimientos."],
      ventas: ["Punto de Venta", "Busqueda rapida, carrito, pagos y emision de tiquete/factura."],
      facturas: ["Facturacion Electronica", "Integracion DIAN con proveedor autorizado (Plemsi/Aliaddo)."],
      reportes: ["Reportes", "Analitica de ventas, ingresos vs gastos y exportacion a PDF."],
      clientes: ["Clientes", "Base de clientes frecuentes e historial de compras por cliente."]
    }),
    []
  );

  const onLogout = () => {
    localStorage.removeItem("nummo_token");
    window.location.href = "/login";
  };

  if (section !== "dashboard") {
    const [title, description] = titleMap[section] || ["Modulo", "Proximamente"]; 
    return (
      <main className="min-h-screen bg-slate-50 md:flex">
        <Sidebar onLogout={onLogout} />
        <div className="flex-1 p-6 md:p-8">
          <PlaceholderPage title={title} description={description} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 md:flex">
      <Sidebar onLogout={onLogout} />

      <section className="flex-1 p-6 md:p-8">
        <header className="mb-6 rounded-2xl bg-brand-950 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Resumen del dia</p>
          <h2 className="mt-2 text-3xl font-bold">Tu negocio, bajo control</h2>
          <p className="mt-1 text-sm text-brand-100">Visualiza ventas, ingresos y stock critico en segundos.</p>
        </header>

        {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Ventas de hoy"
            value={data?.summary?.ventasHoy ?? "-"}
            subtitle="Operacion diaria"
            positive
            icon={TrendingUp}
            iconClassName="text-blue-600"
            topBorderClassName="border-t-blue-500"
          />
          <StatCard
            title="Ingresos de hoy"
            value={data ? formatCop(data.summary.ingresosHoy) : "-"}
            subtitle="Caja actual"
            positive
            icon={DollarSign}
            iconClassName="text-green-600"
            topBorderClassName="border-t-green-500"
          />
          <StatCard
            title="Facturas emitidas"
            value={data?.summary?.facturasHoy ?? "-"}
            subtitle="DIAN: estado en seguimiento"
            icon={FileCheck}
            iconClassName="text-purple-600"
            topBorderClassName="border-t-purple-500"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
            <h3 className="text-lg font-semibold text-brand-950">Ventas semanales</h3>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer>
                <BarChart data={data?.weeklySales || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tickFormatter={toSpanishDay} />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [formatCop(value), "Ventas"]}
                    labelFormatter={(label) => `Dia: ${toSpanishDay(label)}`}
                  />
                  <Bar dataKey="total" fill="#0c9f57" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
            <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-brand-950">
              <AlertTriangle className="text-amber-500" size={20} />
              Alertas de stock bajo
            </h3>
            <ul className="mt-4 space-y-3">
              {(data?.lowStock || []).length === 0 && (
                <li className="rounded-md bg-green-50 p-3 text-sm text-green-700">Todo en orden por ahora.</li>
              )}

              {(data?.lowStock || []).map((item) => (
                <li key={item.id} className="rounded-md border border-red-200 bg-red-50/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                      {Number(item.quantity) < Number(item.min_stock) * 0.5 ? "Critico" : "Bajo"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{item.category}</p>
                  <p className="mt-1 text-sm text-red-700">Stock: {item.quantity} / Minimo: {item.min_stock}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
