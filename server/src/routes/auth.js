import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { createBusiness } from "../models/businessModel.js";
import { createUser, getUserByEmail, getSafeUserById } from "../models/userModel.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const registerSchema = z.object({
  businessName: z.string().min(2, "El nombre del negocio es obligatorio"),
  nit: z.string().min(5, "El NIT es obligatorio"),
  address: z.string().min(5, "La direccion es obligatoria"),
  phone: z.string().min(7, "El telefono es obligatorio"),
  ownerName: z.string().min(2, "El nombre del dueno es obligatorio"),
  email: z.string().email("Correo invalido"),
  password: z.string().min(8, "La contrasena debe tener minimo 8 caracteres"),
  plan: z.enum(["basico", "pro"]).default("basico")
});

const loginSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(1, "La contrasena es obligatoria")
});

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      businessId: user.business_id,
      role: user.role,
      fullName: user.full_name,
      email: user.email
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);

    const existingUser = await getUserByEmail(payload.email);
    if (existingUser) {
      return res.status(409).json({ message: "Ya existe un usuario con ese correo" });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + env.freeTrialDays);

    const business = await createBusiness({
      name: payload.businessName,
      nit: payload.nit,
      address: payload.address,
      phone: payload.phone,
      plan: payload.plan,
      trialEndsAt
    });

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await createUser({
      businessId: business.id,
      fullName: payload.ownerName,
      email: payload.email,
      passwordHash,
      role: "dueno"
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "Registro exitoso",
      token,
      user,
      business
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const user = await getUserByEmail(payload.email);
    if (!user) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const isValidPassword = await bcrypt.compare(payload.password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        business_id: user.business_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getSafeUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
});

export default router;
