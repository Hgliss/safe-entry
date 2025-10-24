import React, { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { QrCode, History, Bell, Info } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNotifications } from "../../hooks/useNotifications";

export default function PadreHome() {
  const [registros, setRegistros] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  // ✅ Hook de notificaciones en tiempo real (no dentro de useEffect)
  useNotifications(user?.id);

  // 🔹 Cargar registros y notificaciones del padre
  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user: sessionUser },
        } = await supabase.auth.getUser();

        if (!sessionUser) return;

        // Obtener person_id del padre
        const { data: userData, error: userError } = await supabase
          .from("app_user")
          .select("person_id")
          .eq("auth_user_id", sessionUser.id)
          .single();

        if (userError) throw userError;
        const guardianId = userData?.person_id;

        // 🔹 Últimos registros de entradas/salidas
        const { data: scanData, error: scanError } = await supabase
          .from("guardian_scan_log")
          .select(
            `
            id,
            direction,
            scanned_at,
            child:child_id (
              first_name,
              first_last_name
            )
          `
          )
          .eq("guardian_id", guardianId)
          .order("scanned_at", { ascending: false })
          .limit(5);

        if (scanError) throw scanError;

        // 🔹 Últimas notificaciones desde la tabla real
        const { data: notifData, error: notifError } = await supabase
          .from("notifications")
          .select("id, title, message, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (notifError) throw notifError;

        setRegistros(scanData || []);
        setNotificaciones(notifData || []);
      } catch (error) {
        console.error("❌ Error al cargar datos del padre:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 🧩 Suscribirse en tiempo real a nuevas notificaciones
    if (user?.id) {
      const channel = supabase
        .channel("notifications-realtime-list")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const nuevaNotif = payload.new;
            setNotificaciones((prev) => [nuevaNotif, ...prev].slice(0, 5)); // actualiza lista visual
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // 🔹 Loader mientras carga la data
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#ECEFF1]">
        <p className="text-gray-600 text-lg">Cargando información...</p>
      </div>
    );
  }

  // 🔹 Interfaz visual
  return (
    <div className="p-6 bg-[#ECEFF1] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Sección QR */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex items-start gap-4">
          <div className="bg-[#17637A]/10 p-3 rounded-full">
            <QrCode size={36} className="text-[#17637A]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#17637A] mb-1">
              Bienvenido a SafeEntry Padres
            </h1>
            <p className="text-gray-700">
              Usa el <strong>código QR</strong> de tus hijos para registrar
              entradas y salidas rápidamente. Muestra el código al personal al
              llegar o salir de la guardería. Tu información siempre estará
              protegida 🔒.
            </p>
          </div>
        </div>

        {/* Últimos registros */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#17637A] flex items-center gap-2">
              <History size={22} /> Últimos registros
            </h2>
            <a
              href="/padres_tutor/historial"
              className="text-sm text-[#17637A] hover:underline"
            >
              Ver historial completo
            </a>
          </div>

          {registros.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {registros.map((reg) => (
                <li
                  key={reg.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {reg.child.first_name} {reg.child.first_last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(reg.scanned_at).toLocaleString("es-GT", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      reg.direction === "in"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {reg.direction === "in" ? "Entrada" : "Salida"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 text-sm text-center">
              No hay registros recientes.
            </p>
          )}
        </div>

        {/* Últimas notificaciones */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#17637A] flex items-center gap-2">
              <Bell size={22} /> Últimas notificaciones
            </h2>
          </div>

          {notificaciones.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {notificaciones.map((n) => (
                <li key={n.id} className="py-3">
                  <p className="text-gray-800 font-medium">{n.title}</p>
                  <p className="text-gray-700">{n.message}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(n.created_at).toLocaleString("es-GT", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 text-sm text-center">
              No hay notificaciones recientes.
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="bg-[#17637A]/10 rounded-2xl p-5 shadow-sm flex items-start gap-3">
          <Info size={28} className="text-[#17637A]" />
          <p className="text-gray-700 text-sm">
            Recuerda mantener actualizados tus datos de contacto en la
            guardería para recibir alertas en tiempo real sobre las actividades
            de tus hijos.
          </p>
        </div>
      </div>
    </div>
  );
}
