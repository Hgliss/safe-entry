// src/pages/auth/SetPassword.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";

export default function SetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();

  const [ready, setReady] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch {
          /* no-op */
        }
        const hash = new URLSearchParams((window.location.hash || "").slice(1));
        const at = hash.get("access_token");
        const rt = hash.get("refresh_token");
        if (at && rt) {
          await supabase.auth.setSession({ access_token: at, refresh_token: rt });
        }
        await waitForSession();

        const pid = Number(new URLSearchParams(window.location.search).get("person_id"));
        if (Number.isFinite(pid)) {
          try {
            await supabase.rpc("claim_account", { p_person_id: pid });
          } catch {}
        }
        setReady(true);
      } catch (e) {
        setErr(e.message || String(e));
      }
    })();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk(false);

    if (p1.length < 8) return setErr("La contraseña debe tener al menos 8 caracteres.");
    if (p1 !== p2) return setErr("Las contraseñas no coinciden.");

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) throw error;
      setOk(true);
      setTimeout(() => redirectByRole(nav), 900);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!ready && !err) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5eb]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
          <p className="text-sm text-[#17637A]">Abriendo enlace seguro…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#f5f5eb]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
      >
        <h1 className="mb-1 text-lg font-semibold text-[#17637A]">
          {params.get("flow") === "reset" ? "Restablecer contraseña" : "Crear contraseña"}
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          {params.get("flow") === "reset"
            ? "Ingresa tu nueva contraseña."
            : "Define una contraseña para futuros ingresos."}
        </p>

        {err && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-700">
            {err}
          </div>
        )}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs text-[#17637A]">Contraseña nueva</span>
          <input
            type="password"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-black focus:border-[#17637A] focus:ring-[#17637A]"
            autoFocus
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-xs text-[#17637A]">Confirmar contraseña</span>
          <input
            type="password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-black focus:border-[#17637A] focus:ring-[#17637A]"
          />
        </label>

        {ok && (
          <div className="mb-3 rounded-lg border border-[#468339] bg-[#A6D930]/20 p-2 text-xs text-[#468339]">
            Contraseña guardada.
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            disabled={saving}
            className="rounded-xl bg-[#468339] px-4 py-2 text-sm font-medium text-white hover:bg-[#17637A] disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* -------- helpers -------- */
async function waitForSession(timeoutMs = 6000) {
  const start = Date.now();
  for (;;) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return true;
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function redirectByRole(nav) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return nav("/login", { replace: true });

  const { data } = await supabase
    .from("v_app_users")
    .select("rol_name")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  const role = (data?.rol_name || "").toLowerCase();
  if (role.startsWith("admin") || role.startsWith("staff") || role.startsWith("teacher"))
    return nav("/admin", { replace: true });
  if (role.startsWith("guardian") || role.startsWith("padre"))
    return nav("/padres", { replace: true });
  return nav("/", { replace: true });
}
