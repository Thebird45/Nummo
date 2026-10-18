import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
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
      const data = await login(form);
      localStorage.setItem("nummo_token", data.token);
      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4 py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl bg-white shadow-soft md:grid-cols-2">
        <section className="hidden bg-brand-950 p-10 text-white md:block">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-100">Nummo</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">Gestion simple para tu negocio en Colombia</h1>
          <p className="mt-4 text-sm text-brand-100">
            Controla ventas, inventario y facturacion electronica en una sola plataforma.
          </p>
        </section>

        <section className="p-8 md:p-10">
          <h2 className="text-3xl font-bold text-brand-950">Iniciar sesion</h2>
          <p className="mt-1 text-sm text-slate-500">Accede a tu panel Nummo</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Correo
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-800 focus:outline-none"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Contrasena
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-800 focus:outline-none"
              />
            </label>

            {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-positive px-4 py-2.5 font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Ingresando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            No tienes cuenta? <Link className="font-semibold text-brand-900" to="/registro">Registrate gratis 15 dias</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
