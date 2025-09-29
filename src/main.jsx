import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { useAuthStore } from "./store/useAuthStore.js";
import "./index.css";

// Inicializa la sesión cuando Zustand termina de hidratar el storage
useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.getState().initializeAuth();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

