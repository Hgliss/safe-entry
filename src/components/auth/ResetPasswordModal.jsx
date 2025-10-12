import React, { useState } from "react";
import { supabase } from "../../api/supabaseClient";

const ResetPasswordModal = ({ onClose }) => {
  const [emailReset, setEmailReset] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    if (!emailReset) {
      setResetMessage("Ingresa tu correo electrónico");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(emailReset, {
      redirectTo: "https://safe-entry-pwa.vercel.app/set-password",
    });

    if (error) {
      setResetMessage(
        "Error al enviar el enlace de restablecimiento. Intenta de nuevo."
      );
    } else {
      setResetMessage("Se ha enviado un enlace para restablecer tu contraseña.");
      setEmailReset("");
      setSent(true);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f5f5eb]/80 backdrop-blur-sm z-50">
      <div className="bg-white border border-[#B9D2E3] p-8 rounded-2xl shadow-xl w-96">
        <h3 className="text-xl font-bold text-[#17637A] mb-4 text-center">
          Restablecer contraseña
        </h3>

        {!sent ? (
          <>
            <label className="block text-sm text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="Ingresa tu correo"
              className="w-full px-4 py-2 border border-[#B9D2E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17637A] transition"
              value={emailReset}
              onChange={(e) => setEmailReset(e.target.value)}
            />

            <button
              onClick={handleResetPassword}
              className="mt-5 w-full bg-[#17637A] hover:bg-[#468339] text-white font-medium py-2 rounded-lg transition"
            >
              Enviar enlace
            </button>

            {resetMessage && (
              <p className="text-sm mt-3 text-center text-red-500">
                {resetMessage}
              </p>
            )}

            <button
              onClick={onClose}
              className="text-sm text-gray-600 mt-4 underline block mx-auto hover:text-[#17637A]"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-[#468339] font-medium">
              {resetMessage}
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full bg-[#A6D930] text-[#17637A] font-semibold py-2 rounded-lg hover:bg-[#B9D2E3] transition"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordModal;
