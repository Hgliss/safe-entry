// src/layouts/ParentLayout.jsx
import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  QrCode,
  UserPlus,
  Bell,
  Clock,
} from "lucide-react";

export default function ParentLayout() {
  return (
    <div className="flex h-screen bg-[#f5f5eb] text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-[#17637A] text-white flex flex-col p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-8">👨‍👩‍👧 SafeEntry</h1>
        <nav className="flex flex-col gap-4">
          <NavLink
            to="/padres/qr"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition ${
                isActive ? "bg-[#468339]" : "hover:bg-[#468339]/80"
              }`
            }
          >
            <QrCode className="w-5 h-5" /> Código QR
          </NavLink>
          <NavLink
            to="/padres/autorizar"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition ${
                isActive ? "bg-[#468339]" : "hover:bg-[#468339]/80"
              }`
            }
          >
            <UserPlus className="w-5 h-5" /> Autorizar Terceros
          </NavLink>
          <NavLink
            to="/padres/historial"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition ${
                isActive ? "bg-[#468339]" : "hover:bg-[#468339]/80"
              }`
            }
          >
            <Clock className="w-5 h-5" /> Historial
          </NavLink>
          <NavLink
            to="/padres/notificaciones"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition ${
                isActive ? "bg-[#468339]" : "hover:bg-[#468339]/80"
              }`
            }
          >
            <Bell className="w-5 h-5" /> Notificaciones
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
