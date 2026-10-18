export function errorHandler(error, _req, res, _next) {
  console.error(error);

  if (error.name === "ZodError") {
    return res.status(400).json({
      message: "Datos invalidos",
      errors: error.errors.map((issue) => ({
        campo: issue.path.join("."),
        mensaje: issue.message
      }))
    });
  }

  if (error.code === "23505") {
    return res.status(409).json({
      message: "Ya existe un registro con ese valor unico"
    });
  }

  return res.status(500).json({
    message: "Error interno del servidor"
  });
}
