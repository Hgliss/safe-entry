import React, { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import QRCode from "qrcode";

export default function QrPage() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchChildren = async () => {
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

        // 🔹 Buscar el registro del padre en la tabla app_user
        const { data: userData, error: userError } = await supabase
          .from("app_user")
          .select("person_id")
          .eq("auth_user_id", user.id)
          .single();

        if (userError || !userData) {
          setError("No se pudo obtener la información del usuario.");
          setLoading(false);
          return;
        }

        const guardianPersonId = userData.person_id;

        // 🔹 Buscar los niños asociados al padre
        const { data, error } = await supabase
          .from("guardian_child_qr")
          .select(`
            id,
            token,
            created_at,
            status,
            child:child_id (
              id_person,
              first_name,
              first_last_name
            )
          `)
          .eq("guardian_id", guardianPersonId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
          setError("No hay niños asignados a este padre.");
          setLoading(false);
          return;
        }

        // 🔹 Evitar duplicados: solo un QR por niño
        const uniqueByChild = [];
        const seen = new Set();

        for (const item of data) {
          if (!seen.has(item.child.id_person)) {
            seen.add(item.child.id_person);
            uniqueByChild.push(item);
          }
        }

        // 🔹 Generar imagen QR en base64 para cada niño
        const childrenWithQr = await Promise.all(
          uniqueByChild.map(async (item) => {
            const qrImage = await QRCode.toDataURL(item.token);
            return {
              id: item.id,
              name: `${item.child.first_name} ${item.child.first_last_name}`,
              qrImage,
            };
          })
        );

        setChildren(childrenWithQr);
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al obtener el código QR.");
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  // --- Renderizado ---
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[#ECEFF1]">
        <p className="text-gray-600">Cargando...</p>
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
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-[#17637A] mb-6">
          Códigos QR de tus hijos
        </h1>

        {children.map((child) => (
          <div
            key={child.id}
            className="mb-8 border border-gray-200 rounded-xl p-5 bg-gray-50 shadow-sm hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-medium text-gray-700 mb-3">
              {child.name}
            </h2>
            <img
              src={child.qrImage}
              alt={`Código QR de ${child.name}`}
              className="mx-auto w-48 h-48 mb-3 border-2 border-[#17637A] rounded-xl p-2 bg-white"
            />
            <p className="text-sm text-gray-600">
              Muestra este código al personal para registrar entradas y salidas.
            </p>
          </div>
        ))}

        {/* Mensaje si no hay niños */}
        {children.length === 0 && (
          <p className="text-gray-500 mt-4">
            No tienes niños asignados actualmente.
          </p>
        )}
      </div>
    </div>
  );
}
