import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../api/supabaseClient";
import { useAuthStore } from "../../store/useAuthStore";
import { CheckCircle, XCircle, Loader2, LogIn, LogOut } from "lucide-react";

export default function ScannerQR() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [direction, setDirection] = useState("in");
  const [lastScan, setLastScan] = useState(null);
  const user = useAuthStore((state) => state.user);
  const qrRegionId = "qr-reader";
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);
  
  // ✅ Inicia el escáner
  useEffect(() => {
    const html5Qrcode = new Html5Qrcode(qrRegionId);
    scannerRef.current = html5Qrcode;
    
    try {
      if (!isRunningRef.current) {
        html5Qrcode.start(
          { facingMode: "environment" }, // Cámara trasera
          { fps: 10, qrbox: { width: 320, height: 320 } },
          async (decodedText) => {
            await handleScan(decodedText.trim());
          },
          (errorMessage) => { /* ignorar errores de escaneo */ }
        );
        isRunningRef.current = true;

        // Ajuste visual del video
        setTimeout(() => {
          const video = document.querySelector(`#${qrRegionId} video`);
          if (video) {
            video.style.width = "100%";
            video.style.height = "100%";
            video.style.objectFit = "cover";
            video.style.borderRadius = "1rem";
          }
        }, 500);
      }
    } catch (err) {
      console.error("Error al iniciar cámara:", err);
      setStatus("error");
      setMessage("No se pudo acceder a la cámara. Verifica permisos.");
    }

    return () => {
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current.stop()
          .then(() => {
            isRunningRef.current = false;
            console.log("Escáner detenido.");
          })
          .catch(err => console.error("Error al detener escáner:", err));
      }
    };
  }, []);

  // ✅ Lógica principal del escaneo
  const handleScan = async (token) => {
    if (!token || status === "loading" || status === "success" || status === "error") return;
    setStatus("loading");
    setMessage("");

    try {
      // 1️⃣ Intentar validar con QR del padre
      const { data: parentResult, error: parentError } = await supabase.rpc(
        "scan_guardian_qr",
        {
          p_token: token,
          p_direction: direction,
          p_scanned_by: user?.id_user,
          p_location: "Entrada principal",
        }
      );

      if (!parentError && parentResult) {
        setLastScan(parentResult);
        await registerLog(parentResult.guardian_id, parentResult.child_id);
        showSuccessMessage(parentResult.guardian_name, parentResult.child_name);
        return;
      }

      // 2️⃣ Intentar con QR de tercero autorizado
      const { data: tempAuth } = await supabase
        .from("child_authorization")
        .select(
          `
          id_authorization,
          qr_token,
          valid_from,
          valid_to,
          status,
          child:child_id (
            id_person,
            first_name,
            first_last_name
          ),
          authorized:authorized_person_id (
            id_person,
            first_name,
            first_last_name
          )
        `
        )
        .eq("qr_token", token)
        .maybeSingle();

      if (!tempAuth) throw new Error("QR no válido o no registrado.");

      const now = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Guatemala" })
      );
      const start = new Date(tempAuth.valid_from);
      const end = new Date(tempAuth.valid_to);

      if (now < start) throw new Error("⏳ QR aún no activo.");
      if (now > end) throw new Error("⛔ QR expirado.");

      // Registrar escaneo del autorizado
      await registerLog(
        tempAuth.authorized.id_person,
        tempAuth.child.id_person,
        "QR temporal de tercero autorizado"
      );

      showSuccessMessage(
        tempAuth.authorized.first_name,
        tempAuth.child.first_name
      );
    } catch (err) {
      console.error("Error:", err.message);
      setStatus("error");
      setMessage(err.message || "QR inválido o error en el registro.");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  // ✅ Registrar el evento en guardian_scan_log
  const registerLog = async (guardian_id, child_id, notes = "") => {
    const { error } = await supabase.from("guardian_scan_log").insert([
      {
        guardian_id,
        child_id,
        direction,
        location: "Entrada principal",
        notes,
      },
    ]);

    if (error) throw error;
  };

  // ✅ Mostrar mensaje de éxito
  const showSuccessMessage = (guardianName, childName) => {
    setStatus("success");
    setMessage(
      `✅ ${guardianName} registró la ${
        direction === "in" ? "entrada" : "salida"
      } de ${childName}.`
    );
    if (navigator.vibrate) navigator.vibrate(200);
    resetAfterDelay();
  };

  // 🔄 Restablecer
  const resetAfterDelay = () => {
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
      setLastScan(null);
    }, 4000);
  };
  // ↔️ Alternar entrada/salida
  const toggleDirection = () => {
    setDirection((prev) => (prev === "in" ? "out" : "in"));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F5EB] text-[#17637A] p-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
        Escáner de Código QR
      </h1>

      {/* 📸 Escáner */}
      <div className="relative flex flex-col items-center w-full">
        <div
          id={qrRegionId}
          className="border-4 border-[#17637A] rounded-2xl shadow-lg bg-black overflow-hidden flex items-center justify-center mx-auto"
          style={{ maxWidth: "500px", borderRadius: "1rem" }}
        ></div>

        {/* 🎛️ Botón Entrada/Salida */}
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={toggleDirection}
            className={`flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-white transition ${
              direction === "in"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {direction === "in" ? <LogIn size={20} /> : <LogOut size={20} />}
            {direction === "in" ? "Entrada" : "Salida"}
          </button>
        </div>
      </div>

      {/* 🔄 Estado */}
      {status === "loading" && (
        <div className="flex flex-col items-center mt-6 text-[#17637A]">
          <Loader2 className="animate-spin w-10 h-10 mb-2" />
          <p>Procesando escaneo...</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center mt-6 text-green-600 text-center px-4 animate-pulse">
          <CheckCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center mt-6 text-red-600 text-center px-4 animate-pulse">
          <XCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">{message}</p>
        </div>
      )}
    </div>
  );
}
