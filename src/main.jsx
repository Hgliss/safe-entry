import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { useAuthStore } from "./store/useAuthStore.js";
import "./index.css";

// Inicializa la sesión cuando Zustand termina de hidratar el storage
useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.getState().initializeAuth();
});


// Registrar el Service Worker personalizado de notificaciones
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/custom-sw.js")
    .then(() => console.log("✅ Custom Service Worker registrado correctamente"))
    .catch((error) =>
      console.error("❌ Error al registrar el Service Worker:", error)
    );
}

//  Detectar si el navegador soporta notificaciones push
if ("Notification" in window) {
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      console.log("🔔 Permiso de notificaciones concedido");
    } else {
      console.warn("🚫 Permiso de notificaciones denegado");
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

