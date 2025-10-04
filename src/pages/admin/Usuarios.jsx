import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import {
    UserCog,
    RefreshCw,
    Search,
    Plus,
    Check,
    X,
    Eye,
    ChevronLeft,
    ChevronRight,
    TreeDeciduousIcon,
    Send,
    Lock,
    Unlock,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Usuarios() {
    const [users, setUsers] = useState([]);
    const [people, setPeople] = useState([]);
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [personId, setPersonId] = useState(null);
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [usuarioActivo, setUsuarioActivo] = useState(null);

    // 🔹 Paginación
    const [page, setPage] = useState(1);
    const limit = 10;
    const totalPages = Math.ceil(users.length / limit);

    // 🔹 Debounce búsqueda
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q), 400);
        return () => clearTimeout(t);
    }, [q]);

    // 🔹 Carga inicial
    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        setError("");
        try {
        const [{ data: us, error: e1 }, { data: ps, error: e2 }] = await Promise.all([
            supabase.rpc("list_app_users"),
            supabase
            .from("person")
            .select(
                "id_person, first_name, middle_name, first_last_name, second_last_name, rol_id"
            )
            .order("id_person", { ascending: false }),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        setUsers(us || []);
        setPeople(ps || []);
        } catch (e) {
            console.error("Error cargando usuarios:", e.message);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // Filtro de usuarios
    const filtered = useMemo(() => {
        const s = debouncedQ.trim().toLowerCase();
        if (!s) return users;
        return users.filter((r) =>
        `${r.email ?? ""} ${r.full_name ?? ""} ${r.rol_name ?? ""}`
            .toLowerCase()
            .includes(s)
        );
    }, [users, debouncedQ]);

    // Personas disponibles
    const selectablePeople = useMemo(() => {
        const taken = new Set(users.map((u) => u.person_id));
        return people.filter((p) => !taken.has(p.id_person));
    }, [people, users]);

    // Enviar invitación
    async function invite(e) {
        e.preventDefault();
        setSending(true);
        setError("");
        try {
            if (!personId) throw new Error("Selecciona la persona.");
            if (!email?.trim()) throw new Error("Ingresa el correo.");
            
            const { data: exist, error: e0 } = await supabase
                .from("app_user")
                .select("id_user")
                .eq("person_id", personId)
                .maybeSingle();
            if (e0) throw e0;
            if (!exist) {
                const { error: insErr } = await supabase.from("app_user").insert({
                    is_active: true,
                    person_id: personId,
                });
            if (insErr) throw insErr;
        }
        const redirectTo = `${import.meta.env.VITE_SITE_URL}/auth/callback?person_id=${personId}`;
        const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: email.trim().toLowerCase(),
            options: { emailRedirectTo: redirectTo },
        });
        if (otpErr) throw otpErr;

        setOpen(false);
        setEmail("");
        setPersonId(null);
        await load();
        alert("✅ Invitación enviada correctamente.");
        } catch (e) {
            setError(e.message);
        } finally {
            setSending(false);
        }
    }

    const handleResendInvitation = async (user) => {
  let correo = user.email?.trim();
  const personId = user.person_id;

  if (!personId) {
    return alert("⚠️ Este usuario no tiene un ID de persona válido.");
  }

  // Si no hay correo o está marcado como "Pendiente", pedirlo manualmente
  if (!correo || correo.toLowerCase() === "pendiente") {
    const nuevoCorreo = prompt(
      "Este usuario no tiene un correo válido registrado. Ingresa un correo para enviar la invitación:"
    );
    if (!nuevoCorreo) return alert("⚠️ Debes ingresar un correo.");
    correo = nuevoCorreo.trim().toLowerCase();
  }

  try {
    const redirectTo = `${import.meta.env.VITE_SITE_URL}/auth/callback?person_id=${personId}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error("❌ Error al reenviar invitación:", error.message);
      alert("❌ No se pudo reenviar la invitación. Verifica el correo.");
    } else {
      alert("📩 Invitación reenviada con éxito.");
    }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    alert("❌ Ocurrió un error al intentar reenviar la invitación.");
  }
};

  // 🔹 Activar / desactivar usuario
    async function toggleActive(u) {
        const { error } = await supabase
        .from("app_user")
        .update({
            is_active: !u.is_active,
            update_at: new Date().toISOString(),
        })
        .eq("id_user", u.id_user);
        if (error) setError(error.message);
        else load();
    }

  // 🔹 Exportar PDF
        const handleExportPDF = () => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter",
    });

    // 🔹 Encabezado
    doc.setFontSize(16);
    doc.text("Reporte de Usuarios - SafeEntry", 40, 50);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 40, 65);

    // 🔹 Datos del cuerpo
    const bodyData = filtered.map((u) => [
      u.full_name || "—",
      u.email || "Pendiente",
      u.rol_name || "—",
      u.is_active ? "Activo" : "Inactivo",
      new Date(u.created_at).toLocaleDateString(),
    ]);

    // 🔹 Tabla
    autoTable(doc, {
      startY: 80,
      head: [["Nombre", "Correo", "Rol", "Estado", "Creado"]],
      body: bodyData,
      theme: "striped",
      headStyles: {
        fillColor: [23, 99, 122], // Azul oscuro
        textColor: 255,
        halign: "center",
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255],
      },
    });

    // 🔹 Guardar PDF
    doc.save("usuarios_safeentry.pdf");
  } catch (error) {
    console.error("❌ Error al exportar PDF:", error);
    alert("❌ No se pudo generar el PDF. Revisa la consola.");
  }
};

    const pageData = filtered.slice((page - 1) * limit, page * limit);

    return (
        <div className="text-gray-900">
        {/* Header */}
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                <UserCog className="h-5 w-5 text-blue-900" />
            </div>
            <h1 className="text-xl font-semibold text-blue-900">Usuarios</h1>
            </div>
            <div className="flex gap-2">
            <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-blue-100"
            >
                🖨️ Exportar PDF
            </button>
            <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-blue-100"
            >
                <RefreshCw className="h-4 w-4 text-blue-600" /> Refrescar
            </button>
            </div>
        </div>

        {/* Métricas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard label="Total usuarios" value={users.length} />
            <MetricCard
            label="Activos"
            value={users.filter((u) => u.is_active).length}
            />
            <MetricCard
            label="Inactivos"
            value={users.filter((u) => !u.is_active).length}
            />
            <MetricCard
            label="Pendientes"
            value={users.filter((u) => !u.email).length}
            />
        </div>

        {/* Búsqueda */}
        <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, correo o rol…"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm w-full max-w-md"
            />
            <button
            onClick={() => setOpen(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
            <Plus className="h-4 w-4" /> Nueva invitación
            </button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-100">
                <tr>
                <Th>Correo</Th>
                <Th>Nombre</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>Creado</Th>
                <Th className="text-right">Acciones</Th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                <tr>
                    <td colSpan={6} className="p-4 text-center text-sm">
                    Cargando…
                    </td>
                </tr>
                ) : pageData.length === 0 ? (
                <tr>
                    <td
                    colSpan={6}
                    className="p-4 text-center text-sm text-gray-500"
                    >
                    Sin usuarios
                    </td>
                </tr>
                ) : (
                pageData.map((u) => (
                    <tr key={u.id_user} className="hover:bg-gray-50">
                    <Td>{u.email || "Pendiente"}</Td>
                    <Td>{u.full_name}</Td>
                    <Td>{u.rol_name}</Td>
                    <Td>
                        <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            u.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                        >
                        {u.is_active ? (
                            <Check className="h-3.5 w-3.5" />
                        ) : (
                            <X className="h-3.5 w-3.5" />
                        )}
                        {u.is_active ? "Activo" : "Inactivo"}
                        </span>
                    </Td>
                    <Td>{new Date(u.created_at).toLocaleDateString()}</Td>
                    <Td align="right" className="flex justify-end gap-2 pr-4">

                        <button
                        onClick={() => toggleActive(u)}
                        title="Activar / Desactivar usuario"
                        className="rounded-lg px-2 py-1 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                        >
                        {u.is_active ? <Lock size={18}/> : <Unlock size={18}/>} 
                        </button>

                        <button
                        onClick={() => setUsuarioActivo(u)}
                        className="ml-2 rounded-lg px-2 py-1 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                        title="Ver detalles"
                        >
                        <Eye className="h-4 w-4" />
                        </button>
                    
            
                        <button 
                        onClick={() => handleResendInvitation(u)} 
                        className="ml-2 rounded-lg px-2 py-1 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                        title="Reenviar invitación">
                        <Send size={18} />
                        </button>
                    </Td> 
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-gray-600">
            Página {page} de {totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
            <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-xl border border-gray-300 p-1 hover:bg-gray-100 disabled:opacity-50"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-xl border border-gray-300 p-1 hover:bg-gray-100 disabled:opacity-50"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
            </div>
        </div>

        {/* Drawer lateral */}
        {usuarioActivo && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
            <div className="w-full max-w-md bg-white p-6 shadow-xl overflow-y-auto">
                <h2 className="text-lg font-semibold text-blue-900 mb-4">
                Detalles de Usuario
                </h2>
                <p><strong>Correo:</strong> {usuarioActivo.email || "Pendiente"}</p>
                <p><strong>Nombre:</strong> {usuarioActivo.full_name}</p>
                <p><strong>Rol:</strong> {usuarioActivo.rol_name}</p>
                <p><strong>Estado:</strong> {usuarioActivo.is_active ? "Activo" : "Inactivo"}</p>
                <p><strong>Creado:</strong> {new Date(usuarioActivo.created_at).toLocaleString()}</p>

                {/* 🔹 Cambiar correo */}
                <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    Actualizar correo
                </h3>
                <form
                    onSubmit={async (e) => {
                    e.preventDefault();
                    const nuevoCorreo = e.target.email.value.trim();
                    if (!nuevoCorreo) return alert("Por favor ingresa un correo válido.");

                    try {
                        const { error } = await supabase
                        .from("app_user")
                        .update({ email: nuevoCorreo })
                        .eq("id_user", usuarioActivo.id_user);
                        if (error) throw error;

                        const { error: otpErr } = await supabase.auth.signInWithOtp({
                        email: nuevoCorreo,
                        options: {
                            emailRedirectTo: `${import.meta.env.VITE_SITE_URL}/auth/callback?person_id=${usuarioActivo.person_id}`,
                        },
                        });
                        if (otpErr) throw otpErr;

                        alert("✅ Correo actualizado y nueva invitación enviada.");
                        setUsuarioActivo(null);
                        load();
                    } catch (err) {
                        alert("❌ Error al actualizar correo: " + err.message);
                    }
                    }}
                    className="flex gap-2"
                >
                    <input
                    type="email"
                    name="email"
                    placeholder="Nuevo correo"
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                    type="submit"
                    className="rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
                    >
                    Guardar
                    </button>
                </form>
                </div>

                <div className="mt-6 flex justify-end">
                <button
                    onClick={() => setUsuarioActivo(null)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                    Cerrar
                </button>
                </div>
            </div>
            </div>
        )}

        {/* Modal de nueva invitación */}
        {open && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-900">Nueva invitación</h2>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-gray-100">
                    <X className="h-5 w-5 text-gray-600" />
                </button>
                </div>

                <form onSubmit={invite} className="grid gap-3">
                <label className="block">
                    <span className="mb-1 block text-xs text-gray-700">Persona</span>
                    <select
                    value={personId ?? ""}
                    onChange={(e) => setPersonId(Number(e.target.value) || null)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                    <option value="">— Seleccionar —</option>
                    {selectablePeople.map((p) => (
                        <option key={p.id_person} value={p.id_person}>
                        {[p.first_name, p.middle_name, p.first_last_name, p.second_last_name]
                            .filter(Boolean)
                            .join(" ")}
                        </option>
                    ))}
                    </select>
                </label>

                <label className="block">
                    <span className="mb-1 block text-xs text-gray-700">Correo</span>
                    <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="usuario@correo.com"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                </label>

                <div className="mt-2 flex justify-end gap-2">
                    <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    >
                    Cancelar
                    </button>
                    <button
                    disabled={sending}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                    >
                    {sending ? "Enviando…" : "Enviar invitación"}
                    </button>
                </div>
                </form>
            </div>
            </div>
        )}
        </div>
    );
    }

    // 🔹 Componentes auxiliares
    function MetricCard({ label, value }) {
return (
        <div className="bg-white shadow rounded-lg p-5">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-blue-900">{value}</p>
        </div>
    );
    }

    function Th({ children, className }) {
    return (
        <th
        className={`px-3 py-2 text-left text-sm font-medium text-blue-900 ${className}`}
        >
        {children}
        </th>
    );
    }

    function Td({ children, align = "left" }) {
    return (
        <td
        className={`px-3 py-2 text-sm text-gray-900 ${
            align === "right" ? "text-right" : ""
        }`}
        >
        {children}
        </td>
    );
}
