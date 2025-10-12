import React, { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { Clock, ArrowDownCircle, ArrowUpCircle, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function HistorialScreen() {
  const [records, setRecords] = useState([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [children, setChildren] = useState([]);
  const [childName, setChildName] = useState("");

  // 📋 Obtener lista de niños
  const fetchChildren = async () => {
    const { data, error } = await supabase
      .from("person")
      .select("id_person, first_name, middle_name, first_last_name, second_last_name")
      .eq("rol_id", 7); // rol_id 5 = niño
    if (!error && data) setChildren(data);
  };

  // 🧾 Obtener historial por niño
  const fetchHistory = async (childId) => {
    const { data, error } = await supabase
      .from("guardian_scan_log")
      .select(
        `
        id,
        direction,
        scanned_at,
        location,
        guardian:guardian_id(first_name, middle_name, first_last_name, second_last_name)
      `
      )
      .eq("child_id", childId)
      .order("scanned_at", { ascending: false });

    if (!error && data) setRecords(data);
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  // 🧾 Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Historial de ${childName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString("es-GT")}`, 14, 27);

    const tableData = records.map((r) => [
      r.direction === "in" ? "Entrada" : "Salida",
      new Date(r.scanned_at).toLocaleString("es-GT"),
      [
        r.guardian?.first_name,
        r.guardian?.middle_name,
        r.guardian?.first_last_name,
        r.guardian?.second_last_name,
      ]
        .filter(Boolean)
        .join(" "),
      r.location || "Ubicación no registrada",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Dirección", "Fecha y hora", "Tutor", "Ubicación"]],
      body: tableData,
      headStyles: { fillColor: [23, 99, 122], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(`Historial_${childName.replace(/\s+/g, "_")}.pdf`);
  };

  // 📊 Exportar a Excel
  const exportToExcel = () => {
    const wsData = records.map((r) => ({
      Dirección: r.direction === "in" ? "Entrada" : "Salida",
      "Fecha y hora": new Date(r.scanned_at).toLocaleString("es-GT"),
      Tutor: [
        r.guardian?.first_name,
        r.guardian?.middle_name,
        r.guardian?.first_last_name,
        r.guardian?.second_last_name,
      ]
        .filter(Boolean)
        .join(" "),
      Ubicación: r.location || "Ubicación no registrada",
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `Historial_${childName.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5EB] text-[#17637A] p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Historial de Ingresos y Egresos</h1>

      {/* Selector de niño */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-6">
        <select
          value={selectedChild}
          onChange={(e) => {
            const selected = children.find((c) => c.id_person == e.target.value);
            setSelectedChild(e.target.value);
            setChildName(
              [selected?.first_name, selected?.middle_name, selected?.first_last_name, selected?.second_last_name]
                .filter(Boolean)
                .join(" ")
            );
            fetchHistory(e.target.value);
          }}
          className="p-3 rounded-xl border border-[#17637A] text-[#17637A] bg-white w-full max-w-md shadow-sm focus:ring-2 focus:ring-[#17637A] focus:outline-none"
        >
          <option value="">Selecciona un niño</option>
          {children.map((child) => (
            <option key={child.id_person} value={child.id_person}>
              {[child.first_name, child.middle_name, child.first_last_name, child.second_last_name]
                .filter(Boolean)
                .join(" ")}
            </option>
          ))}
        </select>

        {/* Botones de exportación */}
        {records.length > 0 && (
          <div className="flex gap-3 mt-3 md:mt-0">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-[#17637A] hover:bg-[#145468] text-white font-semibold px-4 py-2 rounded-xl transition"
            >
              <FileText size={18} /> PDF
            </button>

            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition"
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
          </div>
        )}
      </div>

      {/* Tabla / tarjetas */}
      <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
        {records.length === 0 ? (
          <p className="text-center text-gray-600 italic">
            {selectedChild
              ? "No hay registros disponibles."
              : "Selecciona un niño para ver el historial."}
          </p>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className={`flex items-center justify-between p-4 rounded-2xl shadow-md border-l-8 ${
                record.direction === "in"
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
              }`}
            >
              <div>
                <p className="font-semibold text-lg flex items-center gap-2">
                  {record.direction === "in" ? (
                    <ArrowDownCircle className="text-green-600" size={22} />
                  ) : (
                    <ArrowUpCircle className="text-red-600" size={22} />
                  )}
                  {record.direction === "in" ? "Entrada" : "Salida"}
                </p>
                <p className="text-sm text-gray-700 flex items-center gap-1 mt-1">
                  <Clock size={16} />{" "}
                  {new Date(record.scanned_at).toLocaleString("es-GT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Tutor:{" "}
                  {[
                    record.guardian?.first_name,
                    record.guardian?.middle_name,
                    record.guardian?.first_last_name,
                    record.guardian?.second_last_name,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              </div>
              <span className="text-xs text-gray-500 italic text-right">
                {record.location || "Ubicación no registrada"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
