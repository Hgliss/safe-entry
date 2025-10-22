import React, { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";

export default function Historial() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        // 🔹 Obtener el usuario logueado
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("No hay sesión activa.");
          setLoading(false);
          return;
        }

        // 🔹 Buscar su person_id (como padre/tutor)
        const { data: userData, error: userError } = await supabase
          .from("app_user")
          .select("person_id")
          .eq("auth_user_id", user.id)
          .single();

        if (userError || !userData) {
          setError("No se pudo obtener el usuario actual.");
          setLoading(false);
          return;
        }

        const guardianPersonId = userData.person_id;

        // 🔹 Consultar todos los registros de los hijos asociados a este tutor
        const { data, error } = await supabase
          .from("guardian_scan_log")
          .select(`
            id,
            direction,
            scanned_at,
            location,
            notes,
            child:child_id (
              id_person,
              first_name,
              first_last_name
            )
          `)
          .eq("guardian_id", guardianPersonId)
          .order("scanned_at", { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
          setError("Aún no hay registros de entradas o salidas.");
          setLoading(false);
          return;
        }

        setLogs(data);
      } catch (err) {
        console.error(err);
        setError("Error al obtener el historial.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, []);

  // --- Renderizado ---
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[#ECEFF1]">
        <p className="text-gray-600">Cargando historial...</p>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-[#ECEFF1]">
        <p className="text-red-500">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-3xl">
        <h1 className="text-2xl font-semibold text-[#17637A] mb-6 text-center">
          Historial de Entradas y Salidas
        </h1>

        {logs.map((log) => (
          <div
            key={log.id}
            className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-800">
                {log.child.first_name} {log.child.first_last_name}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  log.direction === "in"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {log.direction === "in" ? "Entrada" : "Salida"}
              </span>
            </div>

            <p className="text-sm text-gray-600">
              <strong>Fecha y hora:</strong>{" "}
              {new Date(log.scanned_at).toLocaleString("es-GT", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>

            {log.location && (
              <p className="text-sm text-gray-600">
                <strong>Ubicación:</strong> {log.location}
              </p>
            )}

            {log.notes && (
              <p className="text-sm text-gray-600">
                <strong>Notas:</strong> {log.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
