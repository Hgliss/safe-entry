import React, { useEffect, useState, useMemo, useCallback, use } from 'react';
import { supabase } from "../../api/supabaseClient";

import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Mail,
  Save,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";


//Constantes
const TABLE = "person";
const ROLE_PARENT_ID = 4;

export default function Padres() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm());
  const [saving, setSaving] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTarget, setInviteTarget] = useState(null);
  const [inviteSending, setInviteSending] = useState(false);

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const from = (page - 1 ) * limit;
      const to = from + limit - 1;
      let query = supabase
        .from(TABLE)
        .select("*", { count: "exact" })
        .eq("rol_id", ROLE_PARENT_ID)
        .order("id_person", { ascending: false })
        .range(from, to);

        if (debouncedQ) {
          const s = `%${debouncedQ}%`;
          query = query.or(
            [
              `first_name.ilike.${s}`,
              `middle_name.ilike.${s}`,
              `first_last_name.ilike.${s}`,
              `second_last_name.ilike.${s}`,
              `municipality.ilike.${s}`,
              `departments.ilike.${s}`,
              `cui.ilike.${s}`,
            ].join(",")
          );
        }

        const { data, count, error } = await query;
        if (error) throw error;
        setItems(data || []);
        setTotal(count || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }

  }, [page, debouncedQ]);

  useEffect(() =>{
    load();
  }, [load]);

  const filtered = useMemo(() => items, [items]);

  // Crear nuevo padre
function openCreate() {
  setEditing(null);
  setForm(initialForm());
  setIsOpen(true);
}

// Editar padre existente
function openEdit(p) {
  setEditing(p);
  setForm(mapFromEntity(p));
  setIsOpen(true);
}

// Guardar (crear o editar)
async function onSubmit(e) {
  e.preventDefault();
  setSaving(true);
  setError("");
  const payload = mapToEntity(form);

  try {
    if (editing?.id_person) {
      // Actualizar
      const { error } = await supabase
        .from(TABLE)
        .update(payload)
        .eq("id_person", editing.id_person);
      if (error) throw error;
    } else {
      // Crear nuevo
      const { error } = await supabase.from(TABLE).insert(payload);
      if (error) throw error;
    }

    setIsOpen(false);
    load();
  } catch (e) {
    alert("❌ Error: " + e.message);
  } finally {
    setSaving(false);
  }
}

// Eliminar
async function onDelete(p) {
  if (!confirm(`¿Eliminar a ${formatFullName(p)}?`)) return;
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id_person", p.id_person);
    if (error) throw error;
    load();
  } catch (e) {
    alert("❌ Error: " + e.message);
  }
}

  // Invitación
  function openInvite(p) {
    setInviteTarget(p);
    setInviteEmail("");
    setInviteOpen(true);
  }

  async function sendInvite(e) {
    e.preventDefault();
    setInviteSending(true);
    try {
      const { data: found } = await supabase
        .from("app_user")
        .select("id_user")
        .eq("person_id", inviteTarget.id_person)
        .maybeSingle();

      if (!found) {
        await supabase.from("app_user").insert({
          person_id: inviteTarget.id_person,
          is_active: true,
        });
      }

      const base = String(import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, ""); 
      const redirectTo = `${base}/set-password?flow=accept&person_id=${inviteTarget.id_person}`;

      const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: inviteEmail.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });

      if (error) throw error;
      alert("📩 Invitación enviada correctamente.");
      setInviteOpen(false);
    } catch (err) {
      alert("❌ Error al enviar invitación: " + err.message);
    } finally {
      setInviteSending(false);
    }
  }

  // 🔹 Exportar PDF
const handleExportPDF = () => {
  console.log("✅ PDF export triggered"); 
  try {
    if (!items || items.length === 0) {
      alert("⚠️ No hay datos para exportar.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter",
    });

    doc.setFontSize(16);
    doc.text("Reporte de Padres / Tutores - SafeEntry", 40, 50);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 40, 65);

    const bodyData = items.map((p) => [
      formatFullName(p),
      p.birth_date ? new Date(p.birth_date).toLocaleDateString() : "—",
      p.phone_number || "—",
      p.cui || "—",
      p.municipality || "—",
      p.departments || "—",
    ]);

    autoTable(doc, {
      startY: 80,
      head: [["Nombre", "Nacimiento", "Teléfono", "CUI", "Municipio", "Departamento"]],
      body: bodyData,
      theme: "striped",
      headStyles: {
        fillColor: [23, 99, 122], // azul SafeEntry
        textColor: 255,
        halign: "center",
      },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [240, 248, 255] },
    });

    doc.save("padres_safeentry.pdf");
  } catch (error) {
    console.error("❌ Error al exportar PDF:", error);
    alert("❌ No se pudo generar el PDF. Revisa la consola.");
  }
};

// 🔹 Exportar Excel
const handleExportExcel = () => {
  try {
    if (!items || items.length === 0) {
      alert("⚠️ No hay datos para exportar.");
      return;
    }

    const wsData = [
      ["Nombre", "Nacimiento", "Teléfono", "CUI", "Municipio", "Departamento"],
      ...items.map((p) => [
        formatFullName(p),
        p.birth_date ? new Date(p.birth_date).toLocaleDateString() : "",
        p.phone_number || "",
        p.cui || "",
        p.municipality || "",
        p.departments || "",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Padres");
    XLSX.writeFile(wb, "padres_safeentry.xlsx");
  } catch (error) {
    console.error("❌ Error al exportar Excel:", error);
    alert("❌ No se pudo generar el Excel. Revisa la consola.");
  }
};
   return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
            <Users className="h-5 w-5"/>
          </div>
          <h1 className="text-xl font-semibold text-blue-900">Padres / Tutores</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-blue-100 "
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-700"/> PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-blue-100"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-700"/> Excel
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            <Plus className="h-4 w-4" /> Nuevo padre/tutor
          </button>
        </div>
      </div>
      {/* Buscador */}
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, municipio o CUI…"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm w-full max-w-md"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-green-100">
            <tr>
              <Th>Nombre</Th>
              <Th>Teléfono</Th>
              <Th>CUI</Th>
              <Th>Municipio</Th>
              <Th>Departamento</Th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-sm text-gray-500">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id_person} className="hover:bg-gray-50">
                  <Td>{formatFullName(p)}</Td>
                  <Td>{p.phone_number || "—"}</Td>
                  <Td>{p.cui || "—"}</Td>
                  <Td>{p.municipality || "—"}</Td>
                  <Td>{p.departments || "—"}</Td>
                  <Td align="right" className="flex justify-end gap-2 pr-4">
                    <ActionBtn icon={<Pencil size={16} />} label="Editar" onClick={() => openEdit(p)} />
                    <ActionBtn icon={<Mail size={16} />} label="Invitar" onClick={() => openInvite(p)} />
                    <ActionBtn icon={<Trash2 size={16} />} label="Eliminar" onClick={() => onDelete(p)} />
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
          Página {page} de {totalPages}
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

      {isOpen && (
        <Modal title={editing ? "Editar padre/tutor" : "Nuevo padre/tutor"} onClose={() => setIsOpen(false)}>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Field
              label="Primer nombre"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
            />
            <Field
              label="Segundo nombre"
              value={form.middle_name}
              onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
            />
            <Field
              label="Primer apellido"
              value={form.first_last_name}
              onChange={(e) => setForm({ ...form, first_last_name: e.target.value })}
              required
            />
            <Field
              label="Segundo apellido"
              value={form.second_last_name}
              onChange={(e) => setForm({ ...form, second_last_name: e.target.value })}
            />
            <Field
              label="Fecha de nacimiento"
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              required
            />
            <Field
              label="Teléfono"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              required
            />
            <Field
              label="CUI"
              value={form.cui}
              onChange={(e) => setForm({ ...form, cui: e.target.value })}
              required
            />
            <Field
              label="Dirección"
              value={form.address_details}
              onChange={(e) => setForm({ ...form, address_details: e.target.value })}
              required
            />
            <Field
              label="Municipio"
              value={form.municipality}
              onChange={(e) => setForm({ ...form, municipality: e.target.value })}
              required
            />
            <Field
              label="Departamento"
              value={form.departments}
              onChange={(e) => setForm({ ...form, departments: e.target.value })}
              required
            />
  <div className="md:col-span-2 flex justify-end gap-2 mt-2">
    <button
      type="button"
      onClick={() => setIsOpen(false)}
      className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
    >
      Cancelar
    </button>
    <button
      disabled={saving}
      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
    >
      <Save size={16} /> {saving ? "Guardando…" : "Guardar"}
    </button>
  </div>
</form>
        </Modal>
      )}

      {inviteOpen && (
        <Modal title="Enviar invitación" onClose={() => setInviteOpen(false)}>
          <form onSubmit={sendInvite} className="grid gap-3">
            <p className="text-sm text-gray-700">
              Enviando a: <strong>{formatFullName(inviteTarget)}</strong>
            </p>
            <Field label="Correo electrónico" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" required />
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setInviteOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
                Cancelar
              </button>
              <button disabled={inviteSending} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">
                {inviteSending ? "Enviando…" : "Enviar link"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function initialForm() {
  return {
    first_name: "",
    middle_name: "",
    first_last_name: "",
    second_last_name: "",
    municipality: "",
    departments: "",
    phone_number: "",
    cui: "",
  };
}
function mapFromEntity(p) {
  return { ...initialForm(), ...p };
}
function mapToEntity(f) {
  return { ...f, rol_id: ROLE_PARENT_ID };
}
function formatFullName(p) {
  return [p.first_name, p.middle_name, p.first_last_name, p.second_last_name].filter(Boolean).join(" ");
}

// UI helpers
function Th({ children, className = "" }) {
  return <th className={`px-3 py-2 text-left text-sm font-medium text-blue-900 ${className}`}>{children}</th>;
}
function Td({ children, align = "left" }) {
  return <td className={`px-3 py-2 text-sm text-gray-900 ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
function ActionBtn({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="rounded-lg px-2 py-1 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100"
    >
      {icon}
    </button>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}