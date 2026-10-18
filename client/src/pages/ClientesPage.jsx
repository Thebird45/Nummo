import { useState, useEffect } from 'react';
import {
  getClientes, crearCliente, actualizarCliente,
  eliminarCliente, getHistorialCliente
} from '../services/clientes';

const TABS = ['Lista', 'Historial'];

const clienteVacio = { nombre: '', documento: '', telefono: '', correo: '', direccion: '' };

export default function ClientesPage() {
  const [tab, setTab] = useState('Lista');
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState(clienteVacio);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => { cargarClientes(); }, []);

  async function cargarClientes() {
    try {
      const data = await getClientes();
      setClientes(data);
    } catch { setError('Error al cargar clientes'); }
  }

  async function verHistorial(cliente) {
    setClienteSeleccionado(cliente);
    setTab('Historial');
    try {
      const data = await getHistorialCliente(cliente.id);
      setHistorial(data);
    } catch { setHistorial([]); }
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) return setError('El nombre es obligatorio');
    setCargando(true);
    setError('');
    try {
      if (editandoId) {
        await actualizarCliente(editandoId, form);
        setExito('Cliente actualizado');
      } else {
        await crearCliente(form);
        setExito('Cliente creado');
      }
      setForm(clienteVacio);
      setEditandoId(null);
      setMostrarForm(false);
      await cargarClientes();
      setTimeout(() => setExito(''), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally { setCargando(false); }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await eliminarCliente(id);
      setExito('Cliente eliminado');
      await cargarClientes();
      setTimeout(() => setExito(''), 3000);
    } catch { setError('No se pudo eliminar'); }
  }

  function handleEditar(c) {
    setForm({ nombre: c.nombre, documento: c.documento || '', telefono: c.telefono || '', correo: c.correo || '', direccion: c.direccion || '' });
    setEditandoId(c.id);
    setMostrarForm(true);
    setTab('Lista');
  }

  function handleCancelar() {
    setForm(clienteVacio);
    setEditandoId(null);
    setMostrarForm(false);
    setError('');
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.documento || '').includes(busqueda) ||
    (c.correo || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => { handleCancelar(); setMostrarForm(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Nuevo cliente
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}
      {exito && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">{exito}</div>}

      {/* Formulario */}
      {mostrarForm && (
        <div className="mb-6 bg-white rounded-xl shadow p-5 border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-4">{editandoId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Nombre *', key: 'nombre', placeholder: 'Nombre completo o razón social' },
              { label: 'Documento (NIT/CC)', key: 'documento', placeholder: 'Ej: 900123456-1' },
              { label: 'Teléfono', key: 'telefono', placeholder: 'Ej: 3001234567' },
              { label: 'Correo', key: 'correo', placeholder: 'correo@ejemplo.com' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Dirección</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Dirección de entrega o fiscal"
                value={form.direccion}
                onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleGuardar}
              disabled={cargando}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Crear cliente'}
            </button>
            <button onClick={handleCancelar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t} {t === 'Historial' && clienteSeleccionado ? `— ${clienteSeleccionado.nombre}` : ''}
          </button>
        ))}
      </div>

      {/* Tab Lista */}
      {tab === 'Lista' && (
        <>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Buscar por nombre, documento o correo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {clientesFiltrados.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              {clientes.length === 0 ? 'Aún no hay clientes registrados.' : 'No hay resultados para tu búsqueda.'}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    {['Nombre', 'Documento', 'Teléfono', 'Correo', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientesFiltrados.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">{c.documento || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.telefono || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.correo || '—'}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => verHistorial(c)} className="text-blue-500 hover:text-blue-700 text-xs">Historial</button>
                        <button onClick={() => handleEditar(c)} className="text-yellow-500 hover:text-yellow-700 text-xs">Editar</button>
                        <button onClick={() => handleEliminar(c.id)} className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab Historial */}
      {tab === 'Historial' && (
        clienteSeleccionado ? (
          historial.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Este cliente no tiene compras registradas.</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    {['# Venta', 'Fecha', 'Items', 'Total', 'Método pago'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historial.map(v => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 text-gray-500">#{v.id}</td>
                      <td className="px-4 py-3">{new Date(v.created_at).toLocaleDateString('es-CO')}</td>
                      <td className="px-4 py-3">{v.cantidad_items}</td>
                      <td className="px-4 py-3 font-medium">${Number(v.total).toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 capitalize">{v.metodo_pago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="text-center py-16 text-gray-400">Selecciona un cliente desde la lista para ver su historial.</div>
        )
      )}
    </div>
  );
}