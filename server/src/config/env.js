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
