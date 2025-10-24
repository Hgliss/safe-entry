// ✅ Service Worker personalizado para notificaciones SafeEntry

// Escucha mensajes enviados desde la app (frontend)
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, message } = event.data.data;
    self.registration.showNotification(title, {
      body: message,
      icon: "/icon.png", // coloca tu ícono real aquí
    });
  }
});

// Escucha notificaciones push (si luego agregas push desde Supabase u otro servicio)
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "SafeEntry";
  const options = {
    body: data.message || "Tienes una nueva notificación",
    icon: "/icon.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
