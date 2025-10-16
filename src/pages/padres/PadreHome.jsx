import React from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
  History,
  Bell,
  UserPlus,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

export default function ParentLayout() {
  const navigate = useNavigate();
  const { logoutUser, user } = useAuthStore();

  const menuItems = [
    {
      title: "Código QR",
      description: "Muestra el código QR del niño o tutor.",
      icon: <QrCode size={38} />,
      color: "bg-[#17637A]",
      action: () => navigate("/padres/qr"),
    },
    
    {
      title: "Historial",
      description: "Visualiza los ingresos y egresos registrados.",
      icon: <History size={38} />,
      color: "bg-green-600",
      action: () => navigate("/padres/historial"),
    },
    {
      title: "Notificaciones",
      description: "Consulta avisos y alertas recientes.",
      icon: <Bell size={38} />,
      color: "bg-yellow-500",
      action: () => navigate("/padres/notificaciones"),
    },
    {
      title: "Autorizar Terceros",
      description: "Crea permisos temporales de retiro.",
      icon: <UserPlus size={38} />,
      color: "bg-[#145468]",
      action: () => navigate("/padres/autorizar"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5EB] text-[#17637A]">
      {/* Encabezado */}
      <header className="w-full bg-[#17637A] text-white py-4 px-4 sm:px-6 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">SafeEntry Padres</h1>
          <p className="text-sm opacity-90">
            Bienvenido, {user?.email || "Usuario"}
          </p>
        </div>
        <button
          onClick={logoutUser}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 rounded-lg transition"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">
          Menú Principal del Tutor
        </h2>

        {/* Grid responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 sm:gap-6 w-full max-w-4xl">
          {menuItems.map((item, index) => (
            <div
              key={index}
              onClick={item.action}
              className={`cursor-pointer flex flex-col justify-between p-6 rounded-2xl shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-200 text-white ${item.color}`}
            >
              <div className="flex items-start justify-between mb-4">
                {item.icon}
                <span className="text-xs sm:text-sm font-semibold bg-white/90 text-[#17637A] px-3 py-1 rounded-full shadow-sm">
                  Ver más
                </span>
              </div>
              <h3 className="text-xl font-bold mb-1">{item.title}</h3>
              <p className="text-sm opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Pie de página */}
      <footer className="w-full text-center py-4 text-sm text-gray-600">
        © {new Date().getFullYear()} SafeEntry — Todos los derechos reservados
      </footer>
    </div>
  );
}
