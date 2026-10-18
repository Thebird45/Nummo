import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { crearNotaCredito, getAcreditable } from "../services/facturas";

const formatCop = (valor) =>
  `$ ${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(valor || 0))}`;

export default function NotaCreditoModal({ factura, onCerrar, onCreada }) {
  const [items, setItems] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [concepto, setConcepto] = useState(2);
  const [motivo, setMotivo] = useState("");
  const [reintegrar, setReintegrar] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAcreditable(factura.id)
      .then(setItems)
      .catch(() => setError("No se pudieron cargar los productos de la factura"));
  }, [factura.id]);

  // Anulacion: todo lo que queda; devolucion: lo que se escriba en cada fila
  const lineas = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          cantidad: concepto === 2 ? item.disponible : Number(cantidades[item.producto_id] || 0)
        }))
        .filter((item) => item.cantidad > 0),
    [items, cantidades, concepto]
  );
  const total = lineas.reduce((suma, item) => suma + item.cantidad * item.precio_unitario, 0);

  const onGuardar = async (event) => {
    event.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const data = await crearNotaCredito(factura.id, {
        concepto,
        motivo,
        reintegrar_inventario: reintegrar,
        ...(concepto === 1 && { items: lineas.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad })) })
      });
      onCreada(data);
    } catch (apiError) {
      const body = apiError.response?.data;
      setError(body?.errors?.[0]?.mensaje || body?.message || "No se pudo crear la nota credito");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={onGuardar} className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Nota credito para {factura.codigo}</h3>
          <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Corrige o anula una factura ya validada. La nota credito se envia a la DIAN y queda ligada a la factura.
        </p>

        {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <div className="mb-4 grid grid-cols-2 gap-2">
          {[
            [2, "Anular factura", "Acredita todo lo que queda de la factura"],
            [1, "Devolucion parcial", "Elige productos y cantidades devueltos"]
          ].map(([valor, titulo, ayuda]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setConcepto(valor)}
              className={`rounded-lg border p-3 text-left ${
                concepto === valor ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{titulo}</p>
              <p className="text-xs text-slate-500">{ayuda}</p>
            </button>
          ))}
        </div>

        <table className="mb-3 w-full text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1 text-left">Producto</th>
              <th className="py-1 text-right">Facturado</th>
              <th className="py-1 text-right">Disponible</th>
              <th className="py-1 text-right">A acreditar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.producto_id}>
                <td className="py-1.5 text-slate-800">{item.nombre}</td>
                <td className="py-1.5 text-right text-slate-500">{item.cantidad}</td>
                <td className="py-1.5 text-right text-slate-500">{item.disponible}</td>
                <td className="py-1.5 text-right">
                  {concepto === 2 ? (
                    <span className="font-semibold">{item.disponible}</span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max={item.disponible}
                      disabled={item.disponible === 0}
                      value={cantidades[item.producto_id] ?? ""}
                      onChange={(e) => setCantidades((prev) => ({ ...prev, [item.producto_id]: e.target.value }))}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right disabled:bg-slate-50"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <label className="block text-sm font-medium text-slate-700">
          Motivo
          <textarea
            required
            minLength={5}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={concepto === 2 ? "Ej: factura emitida a nombre equivocado" : "Ej: el cliente devolvio 2 productos"}
            className="mt-1 min-h-16 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={reintegrar} onChange={(e) => setReintegrar(e.target.checked)} />
          Devolver los productos al inventario
        </label>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Total a acreditar: <span className="font-bold text-slate-900">{formatCop(total)}</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || lineas.length === 0}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {guardando ? "Generando..." : "Generar nota credito"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
