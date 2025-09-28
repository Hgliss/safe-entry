import React, { useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";

const RoleRedirect = () => {
  const role = useAuthStore((state) => state.role);
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "Administrador") navigate("");
    else if (role === "Maestro") navigate("/maestro");
    else if (role === "Padre/Tutor") navigate("/padres_home");
    else navigate("/login");
  }, [role, navigate]);

  return null; // No muestra nada, solo redirige
};

export default RoleRedirect;