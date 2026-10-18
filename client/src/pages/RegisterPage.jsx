import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerBusiness } from "../services/auth";

const initialForm = {
  businessName: "",
  nit: "",
  address: "",
  phone: "",
  ownerName: "",
  email: "",
  password: "",
  plan: "basico"
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await registerBusiness(form);
      localStorage.setItem("nummo_token", data.token);
      navigate("/dashboard");
    } catch (apiError) {
      const data = apiError.response?.data;
      setError(data?.errors?.[0]?.mensaje || data?.message || "No se pudo completar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold text-brand-950">Crear cuenta en Nummo</h1>
        <p className="mt-1 text-sm text-slate-500">15 dias gratis. Sin tarjeta de credito.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Nombre del negocio
            <input name="businessName" required value={form.businessName} onChange={onChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            NIT
            <input name="nit" required value={form.nit} onChange={onChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Telefono
            <input name="phone" required value={form.phone} onChange={onChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Direccion
            <input name="address" required value={form.address} onChange={onChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Nombre del dueno
            <input name="ownerName" required value={form.ownerName} onChange={onChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Correo
            <input type="email" name="email" required value={form.email} onChange={onChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Contrasena
            <input type="password" name="password" required minLength={8} value={form.password} onChange={onChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Plan
            <select name="plan" value={form.plan} onChange={onChange} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="basico">Basico - $49.000 COP/mes (hasta 100 facturas)</option>
              <option value="pro">Pro - $79.000 COP/mes (facturas ilimitadas)</option>
            </select>
          </label>

          {error && <p className="md:col-span-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="md:col-span-2 rounded-md bg-positive px-4 py-2.5 font-semibold text-white disabled:opacity-70"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Ya tienes cuenta? <Link to="/login" className="font-semibold text-brand-900">Inicia sesion</Link>
        </p>
      </div>
    </main>
  );
}
