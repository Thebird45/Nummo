import dotenv from "dotenv";

dotenv.config();

const required = ["DB_URL", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  dbUrl: process.env.DB_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  freeTrialDays: Number(process.env.FREE_TRIAL_DAYS || 15),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  plemsiApiUrl: process.env.PLEMSI_API_URL || "",
  plemsiApiKey: process.env.PLEMSI_API_KEY || "",
  dian: {
    provider: process.env.DIAN_PROVIDER || "simulado",
    // La clave tecnica real llega con la resolucion de numeracion de la DIAN
    claveTecnica: process.env.DIAN_CLAVE_TECNICA || "clave-tecnica-de-pruebas",
    // PIN del software registrado ante la DIAN; se usa en el CUDE de las notas
    softwarePin: process.env.DIAN_SOFTWARE_PIN || "pin-de-pruebas",
    simSegundos: Number(process.env.DIAN_SIM_SEGUNDOS ?? 10)
  },
  emailFrom: process.env.EMAIL_FROM || "no-reply@nummo.co",
  // Sin SMTP_HOST los correos se simulan (no salen)
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || ""
  },
  // Zona del negocio: define que es "hoy" en dashboard, reportes y PDF
  timezone: process.env.APP_TIMEZONE || "America/Bogota"
};
