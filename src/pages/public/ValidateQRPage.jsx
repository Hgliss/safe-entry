import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";

export default function ValidateQRPage() {
  const { token } = useParams(); // 🔹 obtiene el token desde la URL
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);

  useEffect(() => {
    const validarCodigo = async () => {
      try {
        if (!token) {
          setStatus("error");
          return;
        }

        // 🔹 Consultar Supabase por el token QR
        const { data, error } = await supabase
          .from("child_authorization")
          .select(`
            id_authorization,
            valid_from,
            valid_to,
            status,
            child:child_id (
              first_name,
              first_last_name
            ),
            authorized:authorized_person_id (
              first_name,
              first_last_name
            )
          `)
          .eq("qr_token", token)
          .single();

        if (error || !data) {
          console.error(error);
          setStatus("notfound");
          return;
        }

        // 🔹 Comparar fechas
        const now = new Date();
        const inicio = new Date(data.valid_from);
        const fin = new Date(data.valid_to);

        if (data.status === "expirado" || now > fin) {
          setStatus("expired");
        } else if (now < inicio) {
          setStatus("pending");
        } else if (data.status === "activo") {
          setStatus("valid");
        } else {
          setStatus("error");
        }

        setData(data);
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    };

    validarCodigo();
  }, [token]);

  // 🔹 Interfaz visual según estado
  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <p className="text-gray-600 text-center text-lg">
            Validando código, por favor espera...
          </p>
        );

      case "notfound":
        return (
          <div className="text-center">
            <p className="text-red-600 text-2xl font-semibold mb-2">
              ❌ Código no válido
            </p>
            <p className="text-gray-700 text-sm">
              Este código QR no existe o ha sido eliminado.
            </p>
          </div>
        );

      case "expired":
        return (
          <div className="text-center">
            <p className="text-red-600 text-2xl font-semibold mb-2">
              ❌ Código no válido
            </p>
            <p className="text-gray-700 text-sm">
              Este código ha expirado. Solicita al tutor generar uno nuevo.
            </p>
          </div>
        );

      case "pending":
        return (
          <div className="text-center">
            <p className="text-yellow-600 text-2xl font-semibold mb-2">
              ⏳ Aún no activo
            </p>
            <p className="text-gray-700 text-sm">
              Este código estará disponible a partir de{" "}
              {new Date(data.valid_from).toLocaleString("es-GT")}.
            </p>
          </div>
        );

      case "valid":
        return (
          <div className="text-center">
            <p className="text-green-600 text-2xl font-semibold mb-2">
              ✅ Código válido
            </p>
            <p className="text-gray-700 text-base">
              Persona autorizada:{" "}
              <strong>
                {data.authorized.first_name} {data.authorized.first_last_name}
              </strong>
            </p>
            <p className="text-gray-700 text-base mt-1">
              Niño autorizado:{" "}
              <strong>
                {data.child.first_name} {data.child.first_last_name}
              </strong>
            </p>
            <p className="text-gray-600 text-sm mt-3">
              Vigente hasta:{" "}
              {new Date(data.valid_to).toLocaleString("es-GT")}
            </p>
          </div>
        );

      default:
        return (
          <p className="text-gray-600 text-center">
            Ocurrió un error al validar el código.
          </p>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-[#17637A] mb-6 text-center">
          Validación de Código QR
        </h1>
        {renderContent()}
      </div>
    </div>
  );
}
