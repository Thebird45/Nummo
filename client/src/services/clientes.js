import { api } from './api';

export const getClientes = () => api.get('/clientes').then(r => r.data);
export const getCliente = (id) => api.get(`/clientes/${id}`).then(r => r.data);
export const getHistorialCliente = (id) => api.get(`/clientes/${id}/historial`).then(r => r.data);
export const crearCliente = (data) => api.post('/clientes', data).then(r => r.data);
export const actualizarCliente = (id, data) => api.put(`/clientes/${id}`, data).then(r => r.data);
export const eliminarCliente = (id) => api.delete(`/clientes/${id}`).then(r => r.data);