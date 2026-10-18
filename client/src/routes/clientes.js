const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const clienteModel = require('../models/clienteModel');

// GET /api/clientes
router.get('/', auth, async (req, res, next) => {
  try {
    const clientes = await clienteModel.getAll(req.user.business_id);
    res.json(clientes);
  } catch (err) { next(err); }
});

// GET /api/clientes/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const cliente = await clienteModel.getById(req.params.id, req.user.business_id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) { next(err); }
});

// GET /api/clientes/:id/historial
router.get('/:id/historial', auth, async (req, res, next) => {
  try {
    const historial = await clienteModel.getHistorial(req.params.id, req.user.business_id);
    res.json(historial);
  } catch (err) { next(err); }
});

// POST /api/clientes
router.post('/', auth, async (req, res, next) => {
  try {
    const { nombre, documento, telefono, correo, direccion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const nuevo = await clienteModel.create({
      business_id: req.user.business_id,
      nombre, documento, telefono, correo, direccion
    });
    res.status(201).json(nuevo);
  } catch (err) { next(err); }
});

// PUT /api/clientes/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { nombre, documento, telefono, correo, direccion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const actualizado = await clienteModel.update(
      req.params.id, req.user.business_id,
      { nombre, documento, telefono, correo, direccion }
    );
    if (!actualizado) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(actualizado);
  } catch (err) { next(err); }
});

// DELETE /api/clientes/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const ok = await clienteModel.delete(req.params.id, req.user.business_id);
    if (!ok) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ message: 'Cliente eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;