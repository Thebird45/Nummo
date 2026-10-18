import { NavLink } from "react-router-dom";
import {
  BarChart2,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Users
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/ventas", label: "Punto de Venta", icon: ShoppingCart },
  { to: "/facturas", label: "Facturacion", icon: FileText },
  { to: "/reportes", label: "Reportes", icon: BarChart2 },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/configuracion", label: "Configuracion", icon: Settings }
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="w-full border-b border-brand-800 bg-brand-950 p-4 text-white md:h-screen md:w-64 md:border-b-0 md:border-r md:border-brand-800">
      <div className="mb-6 flex items-center justify-between md:block">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">Nummo</p>
          <h1 className="text-2xl font-bold text-white">Panel SaaS</h1>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-md border border-red-400 bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 md:hidden"
        >
          <LogOut size={16} />
          Cerrar sesion
        </button>
      </div>

      <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-brand-900"
                  : "text-brand-100 hover:bg-brand-800 hover:text-white"
              }`
            }
          >
            <link.icon size={16} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 border-t border-brand-800 pt-4" />

      <button
        onClick={onLogout}
        className="hidden w-full items-center justify-center gap-2 rounded-md border border-red-400 bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 md:inline-flex"
      >
        <LogOut size={16} />
        Cerrar sesion
      </button>
    </aside>
  );
}
