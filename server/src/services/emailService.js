import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Sin SMTP configurado se usa jsonTransport: el correo se arma pero no se envia
const simulado = !env.smtp.host;

const transport = simulado
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass }
    });

export async function sendMail({ to, subject, text, attachments }) {
  await transport.sendMail({ from: env.emailFrom, to, subject, text, attachments });
  if (simulado) {
    console.log(`[correo simulado] para ${to}: ${subject}`);
  }
  return { simulado };
}
