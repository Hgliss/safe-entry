import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";


export default function AuthCallback() {
  const navigate = useNavigate();
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    (async () => {
      const url = new URL(window.location.href);

      // Supabase v2 envía ?code=... y ?type=invite|signup|recovery|magiclink|email_change
      let code = url.searchParams.get("code") || "";
      let type = (url.searchParams.get("type") || "").toLowerCase();

      // Por si llega algo en el hash (algunos proveedores/entornos)
      if (!code && window.location.hash) {
        const h = new URLSearchParams(window.location.hash.slice(1));
        code = h.get("code") || code;
        type = (h.get("type") || type).toLowerCase();
      }

      if (!code) {
        navigate("/login?error=missing_code", { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        navigate("/login?error=callback", { replace: true });
        return;
      }

      // Flujos que deben ir a set password
      const goSet = ["invite", "signup", "recovery"].includes(type);
      if (goSet) {
        navigate("/set-password", { replace: true, state: { from: type } });
        return;
      }

      // Otros flujos (magic link, email_change, etc.)
      if (type === "email_change") {
        navigate("/profile?email_change=ok", { replace: true });
        return;
      }

      navigate("/", { replace: true });
    })();
  }, []);

  return (
    <div className="p-8 text-center text-sm text-gray-500">
      Validando enlace…
    </div>
  );
}