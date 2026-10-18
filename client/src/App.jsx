import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import InventarioPage from "./pages/InventarioPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VentasPage from "./pages/VentasPage";
import ReportesPage from "./pages/ReportesPage";
import ClientesPage from './pages/ClientesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage section="dashboard" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventario"
        element={
          <ProtectedRoute>
            <InventarioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventas"
        element={
          <ProtectedRoute>
            <VentasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facturas"
        element={
          <ProtectedRoute>
            <DashboardPage section="facturas" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute>
            <ReportesPage />
          </ProtectedRoute>
        }
      />
      <Route
  path="/clientes"
  element={
    <ProtectedRoute>
      <ClientesPage />
    </ProtectedRoute>
  }
/>

      <Route path="*" element={<Navigate to="/login" replace />} />
      
    </Routes>
  );
}
