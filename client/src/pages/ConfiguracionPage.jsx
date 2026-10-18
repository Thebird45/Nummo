import { useEffect, useState } from "react";
import { Plus, Settings, X } from "lucide-react";
import AlertasResolucion from "../components/AlertasResolucion";
import Sidebar from "../components/Sidebar";
import { crearResolucion, getResoluciones } from "../services/resoluciones";

const formularioVacio = {
  numero_resolucion: "",
  fecha_resolucion: "",
  prefijo: "",
  rango_desde: "",
  rango_hasta: "",
  vigencia_desde: "",
  vigencia_hasta: "",
  clave_tecnica: ""
};

const formatNumero = (valor) => new Intl.NumberFormat("es-CO").format(Number(valor || 0));

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{valor}</p>
    </div>
  );
}

function Campo({ etiqueta, ayuda, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {etiqueta}
      <input {...props} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      {ayuda && <span className="mt-1 block text-xs font-normal text-slate-500">{ayuda}</span>}
    </label>
  );
}

export default function ConfiguracionPage() {
  const [datos, setDatos] = useState(null);
  const [form, setForm] = useState(formularioVacio);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = () =>
    getResoluciones()
      .then(setDatos)
      .catch(() => setError("No se pudo cargar la configuracion"));

  useEffect(() => {
    cargar();
  }, []);

  const onLogout = () => {
    localStorage.removeItem("nummo_token");
    window.location.href = "/login";
  };

  const onChange = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const onGuardar = async (event) => {
    event.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const data = await crearResolucion({ ...form, clave_tecnica: form.clave_tecnica || undefined });
      setDatos((prev) => ({ ...prev, activa: data.activa, alertas: data.alertas }));
      setMensaje(data.message);
      setTimeout(() => setMensaje(""), 4000);
      setForm(formularioVacio);
      setMostrarForm(false);
      await cargar();
    } catch (apiError) {
      const body = apiError.response?.data;
      setError(body?.errors?.[0]?.mensaje || body?.message || "No se pudo guardar la resolucion");
    } finally {
      setGuardando(false);
    }
  };

  const activa = datos?.activa;
  const usados = activa ? activa.total - activa.disponibles : 0;
  const porcentaje = activa ? Math.round((usados / activa.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-50 md:flex">
      <Sidebar onLogout={onLogout} />

      <section className="flex-1 p-6 md:p-8">
        <header className="mb-6 rounded-2xl bg-brand-950 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-500/20 p-2">
              <Settings size={28} className="text-slate-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Configuracion</p>
              <h2 className="text-3xl font-bold">Facturacion electronica</h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-brand-200">
            Registra la resolucion de autorizacion de numeracion que te expidio la DIAN.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>
        )}
        {mensaje && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {mensaje}
          </div>
        )}

        <AlertasResolucion alertas={datos?.alertas} />

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Resolucion activa</h3>
            <button
              onClick={() => setMostrarForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={16} />
              {activa ? "Registrar nueva resolucion" : "Registrar resolucion"}
            </button>
          </div>

          {!datos ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : !activa ? (
            <p className="text-sm text-slate-500">Aun no hay una resolucion registrada. Sin ella no puedes facturar.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Dato etiqueta="Resolucion No." valor={activa.numero_resolucion} />
                <Dato etiqueta="Fecha" valor={activa.fecha_resolucion} />
                <Dato etiqueta="Prefijo" valor={activa.prefijo || "Sin prefijo"} />
                <Dato etiqueta="Vigencia" valor={`${activa.vigencia_desde} a ${activa.vigencia_hasta}`} />
                <Dato etiqueta="Rango autorizado" valor={`${formatNumero(activa.rango_desde)} a ${formatNumero(activa.rango_hasta)}`} />
                <Dato
                  etiqueta="Proxima factura"
                  valor={activa.disponibles > 0 ? `${activa.prefijo}${activa.prefijo ? "-" : ""}${activa.siguiente}` : "Rango agotado"}
                />
                <Dato etiqueta="Disponibles" valor={formatNumero(activa.disponibles)} />
                <Dato etiqueta="Clave tecnica" valor={activa.tiene_clave_tecnica ? "Configurada" : "Sin configurar"} />
              </div>
              <div className="mt-5">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Uso del rango</span>
                  <span>
                    {formatNumero(usados)} de {formatNumero(activa.total)} ({porcentaje}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${porcentaje >= 90 ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {datos?.historial?.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <h3 className="px-5 pt-4 text-sm font-bold text-slate-900">Historial de resoluciones</h3>
            <table className="mt-2 w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {["Resolucion", "Prefijo", "Rango", "Vigencia", "Estado"].map((h) => (
                    <th key={h} className="px-5 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.historial.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2 font-medium text-slate-800">{r.numero_resolucion}</td>
                    <td className="px-5 py-2 text-slate-600">{r.prefijo || "—"}</td>
                    <td className="px-5 py-2 text-slate-600">{formatNumero(r.rango_desde)} a {formatNumero(r.rango_hasta)}</td>
                    <td className="px-5 py-2 text-slate-600">{r.vigencia_desde} a {r.vigencia_hasta}</td>
                    <td className="px-5 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.activa ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.activa ? "Activa" : "Reemplazada"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={onGuardar} className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Nueva resolucion de facturacion</h3>
              <button type="button" onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Copia los datos tal como aparecen en la resolucion de la DIAN. Reemplaza a la resolucion activa.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Campo etiqueta="Numero de resolucion" name="numero_resolucion" required value={form.numero_resolucion} onChange={onChange} placeholder="18764000001234" />
              <Campo etiqueta="Fecha de la resolucion" name="fecha_resolucion" type="date" required value={form.fecha_resolucion} onChange={onChange} />
              <Campo etiqueta="Prefijo" name="prefijo" maxLength={4} value={form.prefijo} onChange={onChange} placeholder="FE" ayuda="Hasta 4 letras o numeros; puede ir vacio" />
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Desde" name="rango_desde" type="number" min="1" required value={form.rango_desde} onChange={onChange} />
                <Campo etiqueta="Hasta" name="rango_hasta" type="number" min="1" required value={form.rango_hasta} onChange={onChange} />
              </div>
              <Campo etiqueta="Vigente desde" name="vigencia_desde" type="date" required value={form.vigencia_desde} onChange={onChange} />
              <Campo etiqueta="Vigente hasta" name="vigencia_hasta" type="date" required value={form.vigencia_hasta} onChange={onChange} />
              <div className="md:col-span-2">
                <Campo
                  etiqueta="Clave tecnica"
                  name="clave_tecnica"
                  value={form.clave_tecnica}
                  onChange={onChange}
                  ayuda="La entrega la DIAN con el rango de numeracion. Se usa para calcular el CUFE."
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setMostrarForm(false)} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar resolucion"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
