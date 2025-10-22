import React, { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import QRCode from "qrcode";

export default function AutorizarPage() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [authorizedName, setAuthorizedName] = useState("");
  const [authorizedLastName, setAuthorizedLastName] = useState("");
  const [dpi, setDpi] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [validTo, setValidTo] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [message, setMessage] = useState("");
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(false);

  const baseUrl =
    window.location.hostname.includes("localhost")
      ? "http://localhost:5173"
      : "https://safe-entry.vercel.app";

  // 🔹 Cargar hijos del tutor
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from("app_user")
          .select("person_id")
          .eq("auth_user_id", user.id)
          .single();

        const guardianPersonId = userData.person_id;

        const { data: hijos } = await supabase
          .from("guardian_child_qr")
          .select(`
            child:child_id (
              id_person,
              first_name,
              first_last_name
            )
          `)
          .eq("guardian_id", guardianPersonId);

        const listaHijos = hijos.map((h) => ({
          id: h.child.id_person,
          nombre: `${h.child.first_name} ${h.child.first_last_name}`,
        }));

        setChildren(listaHijos);
      } catch (err) {
        console.error("Error cargando hijos:", err);
      }
    };

    fetchChildren();
  }, []);

  // 🔹 Generar autorización y QR funcional
  const generarAutorizacion = async () => {
    try {
      if (!selectedChild) {
        setMessage("⚠️ Selecciona un niño antes de continuar.");
        return;
      }

      setLoading(true);
      setMessage("");
      setQrImage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("app_user")
        .select("person_id")
        .eq("auth_user_id", user.id)
        .single();

      const guardianPersonId = userData.person_id;

      // Buscar o crear persona autorizada
      const { data: personaExistente } = await supabase
        .from("person")
        .select("id_person")
        .eq("cui", dpi)
        .maybeSingle();

      let authorizedPersonId;
      if (personaExistente) {
        authorizedPersonId = personaExistente.id_person;
      } else {
        const { data: nuevaPersona } = await supabase
          .from("person")
          .insert([
            {
              first_name: authorizedName,
              first_last_name: authorizedLastName || "(Autorizado)",
              cui: dpi,
              phone_number: phone || "N/A",
              address_details: address || "No especificado",
              municipality: municipality || "Ciudad de Guatemala",
              departments: "Guatemala",
              birth_date: "2000-01-01",
              rol_id: 5,
            },
          ])
          .select()
          .single();

        authorizedPersonId = nuevaPersona.id_person;
      }

      const childData = children.find((c) => c.id === parseInt(selectedChild));
      setChildName(childData ? childData.nombre : "");

      const { data, error } = await supabase
        .from("child_authorization")
        .insert([
          {
            child_id: parseInt(selectedChild),
            authorized_person_id: authorizedPersonId,
            granted_by_guardian_id: guardianPersonId,
            valid_from: new Date().toISOString(),
            valid_to: validTo,
            notes: "Autorización temporal generada por el tutor",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 🎯 QR funcional: solo el qr_token (sin URL ni texto)
      const qrContent = data.qr_token;

      // 🎨 Generar QR visual bonito
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, qrContent, { width: 250, margin: 1 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const width = 400;
      const height = 500;
      canvas.width = width;
      canvas.height = height;

      // Fondo blanco
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Encabezado azul SAFEENTRY
      ctx.fillStyle = "#17637A";
      ctx.fillRect(0, 0, width, 80);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px Montserrat";
      ctx.textAlign = "center";
      ctx.fillText("🧸 SAFEENTRY", width / 2, 50);

      // Dibuja el QR centrado (con el token interno)
      const qrX = (width - 250) / 2;
      ctx.drawImage(qrCanvas, qrX, 100, 250, 250);

      // Texto informativo
      ctx.fillStyle = "#333333";
      ctx.font = "16px Roboto";
      ctx.fillText(`Niño: ${childData.nombre}`, width / 2, 380);
      ctx.fillText(
        `Autorizado: ${authorizedName} ${authorizedLastName}`,
        width / 2,
        405
      );
      ctx.fillText(
        `Válido hasta: ${new Date(validTo).toLocaleString("es-GT")}`,
        width / 2,
        430
      );

      const qrBase64 = canvas.toDataURL("image/png");
      setQrImage(qrBase64);
      setQrToken(data.qr_token);

      setMessage(
        `✅ Código QR generado correctamente. Válido hasta ${new Date(
          validTo
        ).toLocaleString("es-GT")}.`
      );
    } catch (err) {
      console.error(err);
      setMessage("❌ Error al generar autorización: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 📤 Compartir / copiar / descargar / limpiar
  const compartirQR = async () => {
    try {
      if (navigator.share && qrImage) {
        const blob = await (await fetch(qrImage)).blob();
        const filesArray = [
          new File([blob], "safeentry_qr.png", { type: blob.type }),
        ];
        await navigator.share({
          title: "🧸 SafeEntry - Código de Autorización",
          text: "Escanea este código en SafeEntry para validar la autorización.",
          files: filesArray,
        });
      } else {
        alert(
          "Tu dispositivo no soporta compartir directamente. Usa el botón de copiar enlace."
        );
      }
    } catch (error) {
      console.error("Error al compartir:", error);
    }
  };

  const copiarEnlace = async () => {
    const enlace = `${baseUrl}/validate/${qrToken}`;
    await navigator.clipboard.writeText(enlace);
    alert("🔗 Enlace copiado:\n" + enlace);
  };

  const descargarQR = () => {
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = "codigo_autorizacion_safeentry.png";
    link.click();
  };

  const limpiarFormulario = () => {
    setSelectedChild("");
    setAuthorizedName("");
    setAuthorizedLastName("");
    setDpi("");
    setPhone("");
    setAddress("");
    setMunicipality("");
    setValidTo("");
    setQrImage("");
    setQrToken("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-[#ECEFF1] p-6 flex flex-col items-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-[#17637A] mb-4 text-center">
          Autorizar a un tercero
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Selecciona a tu hijo, ingresa los datos del tercero y genera un código
          QR temporal.
        </p>

        {/* Formulario */}
        <div className="space-y-4">
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#17637A]"
          >
            <option value="">Selecciona un niño</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.nombre}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Nombre del autorizado"
            value={authorizedName}
            onChange={(e) => setAuthorizedName(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Apellido del autorizado"
            value={authorizedLastName}
            onChange={(e) => setAuthorizedLastName(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="CUI o DPI"
            value={dpi}
            onChange={(e) => setDpi(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Municipio"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
          <label className="block text-gray-700 text-sm font-medium">
            Vigencia del código (hasta):
          </label>
          <input
            type="datetime-local"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#17637A]"
          />

          <button
            onClick={generarAutorizacion}
            disabled={loading}
            className={`w-full text-white py-2 rounded-lg transition-all ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#17637A] hover:bg-[#145665]"
            }`}
          >
            {loading ? "Generando..." : "Generar código QR"}
          </button>
        </div>

        {message && (
          <p className="text-center mt-4 text-sm text-gray-700">{message}</p>
        )}

        {qrImage && (
          <div className="mt-6 text-center">
            <img
              src={qrImage}
              alt="Código QR de autorización"
              className="mx-auto w-56 h-56 border-2 border-[#17637A] rounded-xl p-2 bg-white"
            />
            <p className="text-sm text-gray-600 mt-2">
              Muestra este código al personal antes de{" "}
              {new Date(validTo).toLocaleString("es-GT")}
            </p>

            <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={compartirQR}
                className="bg-[#17637A] text-white px-4 py-2 rounded-lg hover:bg-[#145665] transition"
              >
                📤 Compartir
              </button>
              <button
                onClick={copiarEnlace}
                className="bg-[#1E3A8A] text-white px-4 py-2 rounded-lg hover:bg-[#142c6d] transition"
              >
                🔗 Copiar enlace
              </button>
              <button
                onClick={descargarQR}
                className="bg-[#4CAF50] text-white px-4 py-2 rounded-lg hover:bg-[#3e8e41] transition"
              >
                💾 Descargar
              </button>
              <button
                onClick={limpiarFormulario}
                className="bg-[#B91C1C] text-white px-4 py-2 rounded-lg hover:bg-[#7F1D1D] transition"
              >
                🧹 Limpiar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
