import React, { useState } from "react";
import { supabase } from "../../api/supabaseClient";

const ResetPasswordModal = ({ onClose }) =>{
    const [emailReset, setEmailReset] = useState("");
    const [resetMessage, setResetMessage] = useState("");
    const [sent, setSent] =useState(false);

    const handleResetPassword = async (e) => {
        if (!emailReset) {
            setResetMessage("Ingresa tu correo electrónico");
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(emailReset, {
            redirectTo: "https://safe-entry-pwa.vercel.app/set-password",
        });

        if (error) {
            setResetMessage( "Error al enviar el enlace de restablecimiento, intentalo de nuevo.");
        }else{
            setResetMessage("Se ha enviado un enlace para restablecer tu contraseña.");
            setEmailReset("");
            setSent(true);
        }
    };

    return(
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-amber-100 p-6 rounded-lg shadow-md w-96">
                <h3 className="text-lg text-cyan-800 font-bold mb-2" >Restablecer contraseña</h3>
            {!sent ? (
                <>
                    <input 
                        type="email"
                        placeholder="Tu correo electrónico"
                        className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-teal-800"
                        value={emailReset}
                        onChange={(e) => setEmailReset(e.target.value)}
                    />
                    <button
                        onClick={handleResetPassword}
                        className = "w-full bg-blue-400 text-white py-2 rounded"
                    >Enviar
                    </button>
                    {resetMessage &&(
                        <p className = "text-sm mt-2 text-center text-red-500">
                            {resetMessage}
                        </p>
                    )}
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-600 mt-3 underline block mx-auto"
                    >
                        Cancelar
                    </button>
                </>
            ) : (
                <>
                <p className="text-center text-green-600 font-medium">
                    {resetMessage}
                </p>
                <button
                    onClick={onClose}
                    className = "mt-4 w-full bg-gray-600 text-white py-2 rounded"
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