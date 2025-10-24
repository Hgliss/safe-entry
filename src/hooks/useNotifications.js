import { useEffect } from "react";
import { supabase } from "../api/supabaseClient";

export const useNotifications = (userId) => {
  useEffect(() => {
    if (!userId) return;

    console.log("📡 Escuchando notificaciones para el usuario:", userId);

    Notification.requestPermission().then((permission) => {
      if (permission !== "granted") {
        console.warn("🚫 Permiso de notificaciones denegado");
        return;
      }

      const channel = supabase
        .channel("realtime:notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const notif = payload.new;
            console.log("🔔 Nueva notificación recibida:", notif);

            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: "SHOW_NOTIFICATION",
                data: notif,
              });
            } else {
              new Notification(notif.title, { body: notif.message });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [userId]);
};
