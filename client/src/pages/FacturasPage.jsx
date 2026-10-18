import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Mail, Search, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { descargarFacturaPdf, enviarFactura, getFacturas, mensajeDeError } from "../services/facturas";

function formatCop(value) {
  const amount = Number(value || 0);
  return `$ ${new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)}`;
}

const estados = {
  pendiente: { label: "Pendiente DIAN", className: "bg-amber-100 text-amber-700" },
  validada: { label: "Validada", className: "bg-emerald-100 text-emerald-700" },
  rechazada: { label: "Rechazada", className: "bg-red-100 text-red-700" }
};

export default function FacturasPage() {
  const [facturas, setFacturas] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(null);
  const [envio, setEnvio] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const cargarFacturas = () =>
    getFacturas()
      .then(setFacturas)
      .catch(() => setError("No se pudieron cargar las facturas"))
      .finally(() => setLoading(false));

  useEffect(() => {
    cargarFacturas();
  }, []);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return facturas
      .map((f) => ({ ...f, codigo: `${f.prefijo}-${f.numero}` }))
      .filter(
        (f) =>
          !q ||
          f.codigo.toLowerCase().includes(q) ||
          (f.cliente_nombre || "").toLowerCase().includes(q)
      );
  }, [facturas, query]);

  const totalFacturado = facturas.reduce((sum, f) => sum + Number(f.total || 0), 0);

  const onLogout = () => {
    localStorage.removeItem("nummo_token");
    window.location.href = "/login";
  };

  const onDescargar = async (factura) => {
    setError("");
    setDescargando(factura.id);
    try {
      await descargarFacturaPdf(factura);
    } catch (apiError) {
      setError(await mensajeDeError(apiError, "No se pudo descargar el PDF"));
    } finally {
      setDescargando(null);
    }
  };

  const onEnviar = async (event) => {
    event.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const data = await enviarFactura(envio.factura.id, envio.correo.trim());
      setMensaje(data.message);
      setTimeout(() => setMensaje(""), 5000);
      setEnvio(null);
      await cargarFacturas();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "No se pudo enviar la factura");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 md:flex">
      <Sidebar onLogout={onLogout} />

      <section className="flex-1 p-6 md:p-8">
        <header className="mb-6 rounded-2xl bg-brand-950 p-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/20 p-2">
                <FileText size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Facturacion</p>
                <h2 className="text-3xl font-bold">Facturas emitidas</h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-300">{formatCop(totalFacturado)}</p>
              <p className="text-xs text-brand-100 mt-1">{facturas.length} facturas</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-brand-200">
            Genera facturas desde el historial del Punto de Venta y descargalas en PDF.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-sm font-medium text-emerald-700">
            {mensaje}
          </div>
        )}

        <div className="mb-4 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por numero o cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-400">Cargando facturas...</p>
          ) : filtradas.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-center">
              <FileText size={32} className="text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">
                {facturas.length === 0 ? "Aun no hay facturas" : "Sin resultados para tu busqueda"}
              </p>
              {facturas.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Ve a Punto de Venta, pestaña Historial, y usa "Facturar" en una venta.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  {["Factura", "Fecha", "Cliente", "Total", "Estado", "Correo", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((f) => {
                  const estado = estados[f.status] || { label: f.status, className: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{f.codigo}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(f.created_at).toLocaleDateString("es-CO")}</td>
                      <td className="px-4 py-3 text-slate-700">{f.cliente_nombre || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{f.total != null ? formatCop(f.total) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${estado.className}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {f.enviada_a ? (
                          <>
                            <p className="text-slate-700">{f.enviada_a}</p>
                            <p>{new Date(f.enviada_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</p>
                          </>
                        ) : (
                          "Sin enviar"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEnvio({ factura: f, correo: f.enviada_a || f.customer_email || "" })}
                          className="mr-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Mail size={14} />
                          Enviar
                        </button>
                        <button
                          onClick={() => onDescargar(f)}
                          disabled={descargando === f.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <Download size={14} />
                          {descargando === f.id ? "Descargando..." : "PDF"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {envio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={onEnviar} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Enviar factura {envio.factura.codigo}</h3>
              <button type="button" onClick={() => setEnvio(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Correo del cliente
              <input
                type="email"
                required
                autoFocus
                value={envio.correo}
                onChange={(e) => setEnvio((prev) => ({ ...prev, correo: e.target.value }))}
                placeholder="cliente@correo.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">Se enviara el PDF de la factura como adjunto.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEnvio(null)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Mail size={15} />
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
