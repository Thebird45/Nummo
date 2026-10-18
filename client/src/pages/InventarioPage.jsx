import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Edit3,
  Package,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import {
  createProduct,
  deleteProduct,
  getMovimientos,
  getProducts,
  registerMovement,
  updateProduct
} from "../services/inventory";

const emptyForm = {
  nombre: "",
  descripcion: "",
  precio: "",
  stock: "0",
  stock_minimo: "0",
  iva_tarifa: "19"
};

const emptyMovementForm = {
  cantidad: "",
  motivo: ""
};

function formatCop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function InventarioPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [movementModalProduct, setMovementModalProduct] = useState(null);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [tabActivo, setTabActivo] = useState("productos");
  const [searchQuery, setSearchQuery] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  const lowStockCount = useMemo(
    () =>
      products.filter((item) => Number(item.stock) <= Number(item.stock_minimo)).length,
    [products]
  );

  const productosFiltered = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const term = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        (p.descripcion || "").toLowerCase().includes(term)
    );
  }, [products, searchQuery]);

  const productosStockBajo = useMemo(
    () => products.filter((item) => Number(item.stock) <= Number(item.stock_minimo)),
    [products]
  );

  const categorias = useMemo(() => {
    const cats = {};
    products.forEach((p) => {
      const cat = p.categoria || "Sin categoría";
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return Object.entries(cats).map(([nombre, count]) => ({
      id: nombre,
      nombre,
      count
    }));
  }, [products]);

  const onLogout = () => {
    localStorage.removeItem("nummo_token");
    window.location.href = "/login";
  };

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "No se pudo cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (tabActivo !== "movimientos") return;
    setLoadingMovimientos(true);
    getMovimientos()
      .then(setMovimientos)
      .catch(() => setMovimientos([]))
      .finally(() => setLoadingMovimientos(false));
  }, [tabActivo]);

  const openNewProductModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsProductModalOpen(true);
    setError("");
    setMessage("");
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const nombreTrimmed = form.nombre.trim();
    if (!nombreTrimmed) {
      setError("El nombre del producto no puede estar vacío");
      return;
    }

    try {
      const payload = {
        nombre: nombreTrimmed,
        descripcion: form.descripcion,
        precio: Number(form.precio),
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        iva_tarifa: Number(form.iva_tarifa)
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        setMessage("Producto actualizado");
      } else {
        await createProduct(payload);
        setMessage("Producto creado");
      }

      setForm(emptyForm);
      setEditingId(null);
      setIsProductModalOpen(false);
      await loadProducts();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "No se pudo guardar el producto");
    }
  };

  const onEdit = (item) => {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      precio: String(item.precio),
      stock: String(item.stock),
      stock_minimo: String(item.stock_minimo),
      iva_tarifa: String(Number(item.iva_tarifa ?? 19))
    });
    setIsProductModalOpen(true);
    setMessage("");
    setError("");
  };

  const onDelete = async (id) => {
    if (!window.confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteProduct(id);
      setMessage("Producto eliminado");
      await loadProducts();
    } catch (apiError) {
      setError(apiError.response?.data?.message || "No se pudo eliminar el producto");
    }
  };

  const openMovementModal = (product) => {
    setMovementModalProduct(product);
    setMovementForm(emptyMovementForm);
    setError("");
    setMessage("");
  };

  const onMovement = async (tipo) => {
    if (!movementModalProduct) return;

    setError("");
    setMessage("");

    try {
      await registerMovement({
        producto_id: movementModalProduct.id,
        tipo,
        cantidad: Number(movementForm.cantidad),
        motivo: movementForm.motivo
      });

      setMessage(`Movimiento ${tipo} registrado`);
      setMovementModalProduct(null);
      setMovementForm(emptyMovementForm);
      await loadProducts();
      if (tabActivo === "movimientos") {
        const data = await getMovimientos();
        setMovimientos(data);
      }
    } catch (apiError) {
      setError(apiError.response?.data?.message || "No se pudo registrar el movimiento");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 md:flex">
      <Sidebar onLogout={onLogout} />

      <section className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden max-h-screen">
        <header className="mb-6 rounded-2xl bg-brand-950 p-6 text-white flex-shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Inventario</p>
              <h2 className="mt-2 text-3xl font-bold">Control de productos</h2>
              <p className="mt-1 text-sm text-brand-100">
                Productos totales: {products.length} | Bajo stock: {lowStockCount}
              </p>
            </div>

            {tabActivo === "productos" && (
              <button
                type="button"
                onClick={openNewProductModal}
                className="inline-flex items-center gap-2 rounded-md bg-positive px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Agregar producto
              </button>
            )}
          </div>
        </header>

        <div className="mb-4 flex-shrink-0 border-b border-slate-200">
          <div className="flex gap-1">
            {[
              { id: "productos", label: "Productos" },
              { id: "categorias", label: "Categorías" },
              { id: "stock-bajo", label: "Stock bajo" },
              { id: "movimientos", label: "Movimientos" }
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
          {message && <p className="mb-4 rounded-md bg-green-50 p-2 text-sm text-green-700">{message}</p>}
          {error && <p className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          {loading && <p className="text-sm text-slate-500">Cargando...</p>}

          {tabActivo === "productos" && (
            <div className="space-y-4 pb-6">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Categoría</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Precio</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Stock</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFiltered.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-500 flex-shrink-0">
                                <Package size={18} />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{item.nombre}</p>
                                <p className="text-xs text-slate-500">{item.descripcion}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700 text-sm">{item.categoria || "—"}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {formatCop(item.precio)}
                            <p className="text-xs font-normal text-slate-500">IVA {Number(item.iva_tarifa ?? 19)}% incluido</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                Number(item.stock) <= Number(item.stock_minimo)
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {item.stock}
                              {Number(item.stock) <= Number(item.stock_minimo) ? " ⚠" : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => onEdit(item)}
                                className="inline-flex items-center gap-1 rounded-md border border-brand-900 px-2 py-1 text-xs font-semibold text-brand-900 hover:bg-slate-50 transition"
                              >
                                <Edit3 size={13} />
                                Editar
                              </button>
                              <button
                                onClick={() => onDelete(item.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-red-600 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-slate-50 transition"
                              >
                                <Trash2 size={13} />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {productosFiltered.length === 0 && !loading && (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500">
                            {searchQuery ? "No se encontraron productos" : "No hay productos registrados"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActivo === "categorias" && (
            <div className="space-y-4 pb-6">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-positive px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Agregar categoría
              </button>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categorias.map((cat) => (
                  <div key={cat.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-slate-900">{cat.nombre}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {cat.count} producto{cat.count !== 1 ? "s" : ""}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button className="text-xs font-semibold text-brand-900 hover:underline">Editar</button>
                      <span className="text-slate-300">•</span>
                      <button className="text-xs font-semibold text-red-600 hover:underline">Eliminar</button>
                    </div>
                  </div>
                ))}

                {categorias.length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-500 text-sm">
                    No hay categorías registradas
                  </div>
                )}
              </div>
            </div>
          )}

          {tabActivo === "stock-bajo" && (
            <div className="space-y-4 pb-6">
              {productosStockBajo.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    {productosStockBajo.length} producto
                    {productosStockBajo.length !== 1 ? "s" : ""} necesitan reabastecimiento
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Precio</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Stock actual</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Stock mínimo</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosStockBajo.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{item.nombre}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{formatCop(item.precio)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">
                              {item.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{item.stock_minimo}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openMovementModal(item)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                            >
                              <ArrowUpCircle size={13} />
                              Reabastecer
                            </button>
                          </td>
                        </tr>
                      ))}

                      {productosStockBajo.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500">
                            Todos los productos tienen stock suficiente
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActivo === "movimientos" && (
            <div className="space-y-4 pb-6">
              {loadingMovimientos && (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
                  Cargando movimientos...
                </div>
              )}

              {!loadingMovimientos && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Producto</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Tipo</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Cantidad</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map((mov) => (
                          <tr key={mov.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td className="px-4 py-3 text-slate-700">
                              {new Date(mov.created_at).toLocaleDateString("es-CO")} {" "}
                              {new Date(mov.created_at).toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{mov.producto}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                  mov.tipo === "entrada"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {mov.tipo === "entrada" ? "Entrada" : "Salida"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">{mov.cantidad}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{mov.motivo || "—"}</td>
                          </tr>
                        ))}

                        {movimientos.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500">
                              No hay movimientos registrados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <article className="w-full max-w-xl rounded-xl bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-950">
                {editingId ? "Editar producto" : "Crear producto"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Nombre
                <input
                  name="nombre"
                  required
                  value={form.nombre}
                  onChange={onChange}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Descripción
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={onChange}
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Precio
                  <input
                    name="precio"
                    type="number"
                    min="1"
                    required
                    value={form.precio}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Stock
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    required
                    value={form.stock}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Stock mínimo
                  <input
                    name="stock_minimo"
                    type="number"
                    min="0"
                    required
                    value={form.stock_minimo}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  IVA (incluido en el precio)
                  <select
                    name="iva_tarifa"
                    value={form.iva_tarifa}
                    onChange={onChange}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="19">19 % (general)</option>
                    <option value="5">5 %</option>
                    <option value="0">0 % (exento/excluido)</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button type="submit" className="rounded-md bg-positive px-4 py-2 text-sm font-semibold text-white">
                  {editingId ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}

      {movementModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <article className="w-full max-w-lg rounded-xl bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-950">Movimiento de inventario</h3>
              <button
                type="button"
                onClick={() => {
                  setMovementModalProduct(null);
                  setMovementForm(emptyMovementForm);
                }}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              Producto: <span className="font-semibold text-slate-800">{movementModalProduct.nombre}</span>
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Cantidad
                <input
                  type="number"
                  min="1"
                  value={movementForm.cantidad}
                  onChange={(event) =>
                    setMovementForm((prev) => ({ ...prev, cantidad: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Motivo
                <input
                  type="text"
                  value={movementForm.motivo}
                  onChange={(event) =>
                    setMovementForm((prev) => ({ ...prev, motivo: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => onMovement("entrada")}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                type="button"
              >
                <ArrowUpCircle size={16} />
                Agregar stock
              </button>
              <button
                onClick={() => onMovement("salida")}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
                type="button"
              >
                <ArrowDownCircle size={16} />
                Retirar stock
              </button>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
