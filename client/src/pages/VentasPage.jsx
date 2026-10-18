import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Download,
  FileText,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Zap
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { createPosSale, getPosAvailableProducts, getRecentSales } from "../services/pos";
import { getClientes } from "../services/clientes";
import { crearFactura, descargarFacturaPdf, mensajeDeError } from "../services/facturas";

function formatCop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatTimeAgo(dateValue) {
  const targetDate = new Date(dateValue);
  const diffSeconds = Math.floor((Date.now() - targetDate.getTime()) / 1000);

  if (Number.isNaN(diffSeconds) || diffSeconds < 0) return "hace unos segundos";
  if (diffSeconds < 60) return "hace unos segundos";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

export default function VentasPage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("Cliente de mostrador");
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastTicket, setLastTicket] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [tabActivo, setTabActivo] = useState("catalogo");
  const [historialFiltros, setHistorialFiltros] = useState({ query: "", metodo: "todos" });
  const [facturando, setFacturando] = useState(null);

  const onLogout = () => {
    localStorage.removeItem("nummo_token");
    window.location.href = "/login";
  };

  const onFacturar = async (saleId) => {
    setError("");
    setFacturando(saleId);
    try {
      const factura = await crearFactura(saleId);
      const codigo = `${factura.prefijo}-${factura.numero}`;
      if (factura.status === "rechazada") {
        setError(`Factura ${codigo} rechazada: ${(factura.dian_respuesta?.mensajes || []).join("; ")}`);
      } else {
        setSuccess(`Factura ${codigo} generada`);
        setTimeout(() => setSuccess(""), 3000);
      }
      setLastTicket((prev) =>
        prev?.venta_id === saleId ? { ...prev, factura: { id: factura.id, codigo } } : prev
      );
      setRecentSales(await getRecentSales());
    } catch (apiError) {
      setError(apiError.response?.data?.message || "No se pudo generar la factura");
    } finally {
      setFacturando(null);
    }
  };

  const onDescargarPdf = async (factura) => {
    setError("");
    try {
      await descargarFacturaPdf(factura);
    } catch (apiError) {
      setError(await mensajeDeError(apiError, "No se pudo descargar el PDF"));
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [productData, salesData, clientesData] = await Promise.all([
          getPosAvailableProducts(),
          getRecentSales(),
          getClientes()
        ]);
        setProducts(productData);
        setRecentSales(salesData);
        setClientes(clientesData);
      } catch (apiError) {
        setError(apiError.response?.data?.message || "No se pudo cargar el POS");
      }
    };

    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((item) => item.nombre.toLowerCase().includes(term));
  }, [products, query]);

  const recentSalesFiltradas = useMemo(() => {
    return recentSales.filter((s) => {
      const matchQuery =
        !historialFiltros.query.trim() ||
        (s.cliente_nombre || s.customer_name || "").toLowerCase().includes(historialFiltros.query.toLowerCase());
      const matchMetodo =
        historialFiltros.metodo === "todos" || s.payment_method === historialFiltros.metodo;
      return matchQuery && matchMetodo;
    });
  }, [recentSales, historialFiltros]);

  const addToCart = (product) => {
    setError("");
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.cantidad >= Number(product.stock)) {
          setError("No puedes superar el stock disponible");
          return prev;
        }

        return prev.map((item) =>
          item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }

      return [...prev, { ...product, cantidad: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== productId) return item;
          const maxStock = Number(item.stock);
          const normalized = Math.max(0, Math.min(maxStock, Number(quantity)));
          return { ...item, cantidad: normalized };
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.precio) * Number(item.cantidad), 0),
    [cart]
  );

  const checkout = async () => {
    if (cart.length === 0) {
      setError("Agrega productos al carrito antes de cobrar");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const nombreCliente = clienteId
        ? clientes.find((c) => c.id === Number(clienteId))?.nombre || customerName
        : customerName;

      const ticket = await createPosSale({
        customer_name: nombreCliente,
        cliente_id: clienteId ? Number(clienteId) : null,
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          producto_id: item.id,
          cantidad: item.cantidad
        }))
      });

      setLastTicket(ticket);
      setSuccess(`Venta registrada: ${ticket.venta_id}`);
      setTimeout(() => setSuccess(""), 3000);
      setCart([]);
      setClienteId("");

      const [productData, salesData] = await Promise.all([
        getPosAvailableProducts(),
        getRecentSales()
      ]);
      setProducts(productData);
      setRecentSales(salesData);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "No se pudo registrar la venta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 md:flex">
      <Sidebar onLogout={onLogout} />

      <section className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden max-h-screen">
        <header className="mb-6 rounded-2xl bg-brand-950 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/20 p-2">
                <Zap size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Punto de Venta</p>
                <h2 className="text-3xl font-bold">POS operativo</h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-300">{formatCop(total)}</p>
              <p className="text-xs text-brand-100 mt-1">Total carrito</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-brand-200">
            Crea ventas, descuenta inventario y registra salida automaticamente.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200 text-sm font-medium text-red-700 flex-shrink-0">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-sm font-medium text-emerald-700 flex-shrink-0">
            {success}
          </div>
        )}

        <div className="mb-4 flex-shrink-0 border-b border-slate-200">
          <div className="flex gap-1">
            {[
              { id: "catalogo", label: "Catálogo" },
              { id: "carrito", label: "Carrito", badge: cart.length > 0 ? cart.length : null },
              { id: "historial", label: "Historial" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
                  tabActivo === tab.id
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tabActivo === "catalogo" && (
            <div className="space-y-4 pb-6">
              <div className="sticky top-0 bg-slate-50 pb-4 pt-2 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full rounded-lg border-2 border-slate-300 pl-10 pr-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  />
                </div>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((item) => (
                  <li
                    key={item.id}
                    className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all duration-200"
                  >
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-100 to-slate-100 h-24 flex items-center justify-center">
                      <div className="text-slate-300 group-hover:text-emerald-300 transition">
                        <ShoppingBag size={36} strokeWidth={1.5} />
                      </div>

                      <div
                        className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold flex items-center gap-1 ${
                          Number(item.stock) <= 5
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            Number(item.stock) <= 5 ? "bg-red-500" : "bg-emerald-500"
                          }`}
                        />
                        {item.stock} unid.
                      </div>
                    </div>

                    <div className="p-4">
                      <p className="font-semibold text-slate-800 text-sm line-clamp-2">{item.nombre}</p>
                      <p className="mt-3 text-3xl font-extrabold text-emerald-600">{formatCop(item.precio)}</p>
                      <button
                        onClick={() => addToCart(item)}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow-md transition-all duration-150 active:scale-95"
                        type="button"
                      >
                        <Plus size={16} />
                        Agregar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingBag size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No se encontraron productos</p>
                </div>
              )}
            </div>
          )}

          {tabActivo === "carrito" && (
            <div className="space-y-4 pb-6">
              <div className="space-y-3 pb-4 bg-white rounded-lg border border-slate-200 p-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Cliente
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  >
                    <option value="">— Consumidor final —</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}{c.documento ? ` · ${c.documento}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Método de pago
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-emerald-600" />
                  Items del carrito ({cart.length})
                </h3>

                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 text-sm">{item.nombre}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatCop(Number(item.precio) * Number(item.cantidad))}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 p-1 bg-slate-50">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, Number(item.cantidad) - 1)}
                              className="rounded p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-900">{item.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, Number(item.cantidad) + 1)}
                              className="rounded p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{formatCop(item.precio)}</span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="h-20 flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                      <ShoppingCart size={28} className="text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-400">Carrito vacío</p>
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 p-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-[0.05em]">
                  Total a cobrar
                </p>
                <p className="mt-2 text-4xl font-extrabold text-emerald-700">{formatCop(total)}</p>
              </div>

              <button
                type="button"
                onClick={checkout}
                disabled={loading || cart.length === 0}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 font-bold text-white shadow-md transition-all duration-150 ${
                  cart.length === 0 || loading
                    ? "bg-slate-300 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 hover:shadow-lg"
                }`}
              >
                <CreditCard size={19} />
                {loading ? "Procesando..." : "Cobrar"}
              </button>

              {lastTicket && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <p className="font-bold text-emerald-900">Venta registrada</p>
                  <p className="mt-1 text-emerald-700">Ticket: {lastTicket.venta_id}</p>
                  <p className="text-emerald-700">Total: {formatCop(lastTicket.total)}</p>
                  {lastTicket.factura ? (
                    <button
                      onClick={() => onDescargarPdf(lastTicket.factura)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 font-semibold text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                    >
                      <Download size={13} />
                      Factura {lastTicket.factura.codigo} · PDF
                    </button>
                  ) : (
                    <button
                      onClick={() => onFacturar(lastTicket.venta_id)}
                      disabled={facturando === lastTicket.venta_id}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <FileText size={13} />
                      {facturando === lastTicket.venta_id ? "Generando..." : "Generar factura"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tabActivo === "historial" && (
            <div className="space-y-4 pb-6">
              <div className="flex flex-wrap gap-3 bg-white rounded-lg border border-slate-200 p-3">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={historialFiltros.query}
                    onChange={(e) =>
                      setHistorialFiltros((prev) => ({ ...prev, query: e.target.value }))
                    }
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex gap-1.5">
                  {["todos", "efectivo", "transferencia"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setHistorialFiltros((prev) => ({ ...prev, metodo: m }))}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                        historialFiltros.metodo === m
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {m === "todos" ? "Todos" : m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-brand-950 mb-3 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-emerald-600" />
                  Últimas ventas
                  <span className="text-xs font-normal text-slate-400">
                    ({recentSalesFiltradas.length} resultados)
                  </span>
                </h3>

                <ul className="space-y-2">
                  {recentSalesFiltradas.length > 0 ? (
                    recentSalesFiltradas.map((sale) => (
                      <li
                        key={sale.id}
                        className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 text-sm">{sale.cliente_nombre || sale.customer_name || "Cliente"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{formatTimeAgo(sale.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-700 text-sm">{formatCop(sale.total)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.03em] ${
                              sale.payment_method === "efectivo"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {sale.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
                          </span>
                          {sale.factura_codigo ? (
                            <button
                              onClick={() => onDescargarPdf({ id: sale.factura_id, codigo: sale.factura_codigo })}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                            >
                              <Download size={13} />
                              {sale.factura_codigo}
                            </button>
                          ) : (
                            <button
                              onClick={() => onFacturar(sale.id)}
                              disabled={facturando === sale.id}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                              <FileText size={13} />
                              {facturando === sale.id ? "Generando..." : "Facturar"}
                            </button>
                          )}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="h-20 flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                      <ShoppingBag size={28} className="text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-400">Sin resultados</p>
                    </li>
                  )}
                </ul>
              </div>

              {recentSales.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-600">
                    Total de ventas: <span className="font-bold text-slate-900">{recentSales.length}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Ingresos:{" "}
                    <span className="font-bold text-emerald-700">
                      {formatCop(recentSales.reduce((sum, s) => sum + Number(s.total), 0))}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
