// ✅ Archivo: src/pages/AsignarTutores.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";
import { Users, ChevronLeft, X, Trash2, Plus } from "lucide-react";

const REL_TABLE = "person_relationship";
const PERSON_TABLE = "person";
const ROLE_PARENT = 4;

export default function AsignarTutores() {
  const { id } = useParams(); // id del niño
  const navigate = useNavigate();

  const [child, setChild] = useState(null);
  const [tutores, setTutores] = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    setLoading(true);
    const [{ data: niño }, { data: actuales }, { data: posibles }] = await Promise.all([
      supabase.from(PERSON_TABLE).select("*").eq("id_person", id).maybeSingle(),
      supabase
        .from(REL_TABLE)
        .select("guardian_id, person:guardian_id(first_name, first_last_name)")
        .eq("child_id", id)
        .eq("active", true),
      supabase
        .from(PERSON_TABLE)
        .select("id_person, first_name, first_last_name")
        .eq("rol_id", ROLE_PARENT),
    ]);

    setChild(niño);
    setTutores(actuales || []);
    setDisponibles(posibles?.filter(
      (p) => !actuales?.some((rel) => rel.guardian_id === p.id_person)
    ) || []);
    setLoading(false);
  }

async function asignarTutor(guardianId) {
  const payload = {
    child_id: Number(id),
    guardian_id: Number(guardianId),
    relationship_type: "Padre",
    active: true,
    created_at: new Date().toISOString(), // opcional, ya que tiene DEFAULT en la BD
  };

  console.log("Asignando tutor con payload:", payload);

  const { error } = await supabase
    .from("person_relationship")
    .insert(payload);

  if (error) {
    console.error("❌ Error al asignar tutor:", error.message);
    alert("❌ No se pudo asignar tutor:\n" + error.message);
  } else {
    loadAll();
  }
}

  async function eliminarTutor(guardian_id) {
    const { error } = await supabase
      .from(REL_TABLE)
      .delete()
      .eq("child_id", id)
      .eq("guardian_id", guardian_id);
    if (!error) loadAll();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
          <Users className="w-6 h-6" /> Asignar tutores a niño
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-100"
        >
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
      </div>

      {loading || !child ? (
        <p className="text-gray-500">Cargando información del niño...</p>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-gray-700 text-sm">Niño:</p>
            <h3 className="text-lg font-semibold">
              {[child.first_name, child.middle_name, child.first_last_name].filter(Boolean).join(" ")}
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Tutores actuales */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Tutores asignados</h4>
              <div className="space-y-2">
                {tutores.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay tutores asignados.</p>
                ) : (
                  tutores.map((t) => (
                    <div
                      key={t.guardian_id}
                      className="flex justify-between items-center border px-4 py-2 rounded-xl shadow-sm"
                    >
                      <span>
                        {t.person.first_name} {t.person.first_last_name}
                      </span>
                      <button
                        onClick={() => eliminarTutor(t.guardian_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Disponibles para asignar */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Tutores disponibles</h4>
              <div className="space-y-2">
                {disponibles.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay más tutores disponibles.</p>
                ) : (
                  disponibles.map((p) => (
                    <div
                      key={p.id_person}
                      className="flex justify-between items-center border px-4 py-2 rounded-xl shadow-sm"
                    >
                      <span>
                        {p.first_name} {p.first_last_name}
                      </span>
                      <button
                        onClick={() => asignarTutor(p.id_person)}
                        className="text-green-700 hover:text-green-900"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
