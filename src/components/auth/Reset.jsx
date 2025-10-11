import React, { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Reset() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
        setSessionReady(true);
      } catch (error) {
        console.error("Error al intercambiar sesión:", error);
        setMessage("El enlace no es válido o ha expirado.");
      }
    };
    verifySession();
  }, []);

  const handlePasswordReset = async () => {
    if (!password || !confirm) {
      setMessage("Completa ambos campos.");
      return;
    }

    if (password !== confirm) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage("Ocurrió un error al restablecer tu contraseña.");
    } else {
      setMessage("✅ Contraseña actualizada correctamente.");
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <p className="text-cyan-800 text-lg font-medium">
          Verificando enlace, por favor espera...
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-50 font-sans">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-96 border-t-4 border-blue-500">
        <h2 className="text-2xl font-bold text-center text-cyan-900 mb-6">
          Restablecer contraseña
        </h2>

        <div className="space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            onClick={handlePasswordReset}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Guardar nueva contraseña
          </button>

          {message && (
            <p className="text-center text-sm mt-3 text-cyan-800 font-medium">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
