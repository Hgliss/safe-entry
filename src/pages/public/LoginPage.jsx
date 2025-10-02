import React, { useState } from 'react';
import LoginForm from "../../components/auth/LoginForm";
import ResetPasswordModal from "../../components/auth/ResetPasswordModal";

const LoginPage = () =>{
    const [showResetModal, setShowResetModal] = useState(false);

    return(
    <div className="min-h-screen flex font-sans">
      {/* LADO IZQUIERDO */}
      <div className="hidden md:flex w-1/2 items-center justify-center bg-gradient-to-br from-slate-300 to-stone-100 p-10">
        <div className="text-center text-cyan-800 max-w-sm">
          <h2 className="text-5xl font-bold mb-2 text-blue-900">SafeEntry</h2>
          <p className="text-lg text-blue-900">
            Protege lo más importante: tus hijos.
            <br />
            Seguridad, confianza y control para cada ingreso.
          </p>
        </div>
      </div>


        {/* LADO DERECHO */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-stone-100">
            <div className="max-w-md w-full p-10">
                <img
                    src="/pwa-192x192.png"
                    alt="Logo SafeEntry"
                    className="w-28 mx-auto mb-4"
                />
                <h2 className="text-2xl font-bold text-center text-shadow-cyan-800 mb-1">
                    Iniciar Sesión
                </h2>
                <p className="text-center text-gray-600 mb-6 text-sm">
                    Ingresa tus credenciales para acceder al sistema
                </p>

            {/* 🔹 Aquí va tu LoginForm */}
            <LoginForm onShowResetModal={() => setShowResetModal(true)} />
            </div>
        </div>

        {/* 🔹 Modal de recuperación */}
        {showResetModal && (
            <ResetPasswordModal onClose={() => setShowResetModal(false)} />
        )}
    
</div>
    );
};

export default LoginPage;