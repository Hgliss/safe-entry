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

  // ✅ Inicia escáner con soporte nativo (funciona en Vercel)
  const startScanner = async () => {
    const scanner = new Html5Qrcode(qrRegionId);
    scannerRef.current = scanner;

    try {
      if (!isRunningRef.current) {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: 340,
            aspectRatio: 1.0,
            disableFlip: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true, // ✅ Usa el detector nativo del navegador
            },
            videoConstraints: {
              facingMode: { exact: "environment" },
              focusMode: "continuous",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          async (decodedText) => {
            if (decodedText) {
              console.log("✅ Detectado:", decodedText);
              await handleScan(decodedText.trim());
            }
          },
          (errorMessage) => {
            // Ignorar errores de frame
          }
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
        }, 600);
      }
    } catch (err) {
      console.error("Error al iniciar cámara:", err);
      setStatus("error");
      setMessage("No se pudo acceder a la cámara o lector del dispositivo.");
    }
  };

  // ✅ Manejo del escaneo
  const handleScan = async (token) => {
    if (!token || status === "loading" || status === "success" || status === "error") return;
    setStatus("loading");
    setMessage("");

    // Pausa para evitar lecturas múltiples
    if (scannerRef.current && isRunningRef.current) {
      scannerRef.current.pause();
    }

    try {
      // 1️⃣ Intentar validar como QR de padre/tutor
      const { data, error } = await supabase.rpc("scan_guardian_qr", {
        p_token: token,
        p_direction: direction,
        p_scanned_by: user?.id_user,
        p_location: "Entrada principal",
      });

      if (error) throw new Error(error.message);

      if (data) {
        setLastScan(data);
        await registerLog(data.guardian_id, data.child_id);
        showSuccessMessage(data.guardian_name, data.child_name);
        return;
      }

      // 2️⃣ Intentar validar como QR de tercero autorizado
      const { data: tempAuth, error: tempError } = await supabase
        .from("child_authorization")
        .select(
          `id_authorization, valid_from, valid_to, status,
           child:child_id(id_person, first_name, first_last_name),
           authorized:authorized_person_id(id_person, first_name, first_last_name)`
        )
        .eq("qr_token", token)
        .maybeSingle();

      if (tempError) throw new Error("Error al buscar autorización.");
      if (!tempAuth) throw new Error("QR no válido o no registrado.");

      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guatemala" }));
      const start = new Date(tempAuth.valid_from);
      const end = new Date(tempAuth.valid_to);

      if (now < start) throw new Error("⏳ QR aún no activo.");
      if (now > end || tempAuth.status === "expirado") throw new Error("⛔ QR expirado.");

      await registerLog(
        tempAuth.authorized.id_person,
        tempAuth.child.id_person,
        "QR temporal de tercero autorizado"
      );

      showSuccessMessage(
        `${tempAuth.authorized.first_name} ${tempAuth.authorized.first_last_name}`,
        `${tempAuth.child.first_name} ${tempAuth.child.first_last_name}`
      );
    } catch (err) {
      console.error("Error:", err.message);
      setStatus("error");
      setMessage(err.message || "QR inválido o error en el registro.");
      setTimeout(() => setStatus("idle"), 4000);
    } finally {
      // Reanudar escáner después de 4s
      setTimeout(() => {
        if (scannerRef.current && isRunningRef.current) {
          scannerRef.current.resume();
        }
      }, 4000);
    }
  };

  // ✅ Registrar evento en guardian_scan_log
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
      } de ${childName}`
    );
    if (navigator.vibrate) navigator.vibrate(200);
    resetAfterDelay();
  };

  // 🔁 Restablecer estado
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

  // 🧠 Inicia al montar
  useEffect(() => {
    startScanner();
    return () => {
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current.stop().then(() => {
          isRunningRef.current = false;
        });
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F5EB] text-[#17637A] p-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
        Escáner de Código QR
      </h1>

      {/* 📸 Escáner */}
      <div className="relative flex flex-col items-center w-full">
        <div
          id={qrRegionId}
          className="border-4 border-dashed border-[#17637A] rounded-2xl shadow-lg bg-black overflow-hidden flex items-center justify-center mx-auto"
          style={{ width: "340px", height: "340px", borderRadius: "1rem" }}
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
