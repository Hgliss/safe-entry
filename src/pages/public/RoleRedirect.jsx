import React, { useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";

const RoleRedirect = () => {
  const role = useAuthStore((state) => state.role);
  const hydrated = useAuthStore((state) => state.hydrated);
  const navigate = useNavigate();
  console.log("📌 RoleRedirect → role:", role, " | hydrated:", hydrated);


  useEffect(() => {
    if (!role) return;

    if (role === "Administrador") navigate("/admin/dashboard", { replace: true });
    else if (role === "Maestro") navigate("/maestro", { replace: true });
    else if (role === "Padre/Tutor") navigate("/padres/home", { replace: true });
    else navigate("/login", { replace: true });
  }, [role, hydrated, navigate]);

  return <p className="text-center text-gray-500">Redirigiendo...</p>; // No muestra nada, solo redirige
};

export default RoleRedirect;