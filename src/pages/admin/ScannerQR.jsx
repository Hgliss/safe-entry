import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../api/supabaseClient";
import { useAuthStore } from "../../store/useAuthStore";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Camera,
  LogIn,
  LogOut,
} from "lucide-react";

export default function ScannerQR() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [direction, setDirection] = useState("in");
  const [cameraId, setCameraId] = useState(null);
  const [cameras, setCameras] = useState([]);
  const user = useAuthStore((state) => state.user);
  const qrRegionId = "qr-reader";
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);

  // ✅ Inicia escáner de cámara
  const startScanner = async (deviceId) => {
    const scanner = new Html5Qrcode(qrRegionId);
    scannerRef.current = scanner;

    try {
      if (!isRunningRef.current) {
        await scanner.start(
          deviceId ? { deviceId } : { facingMode: "environment" },
          { fps: 10, qrbox: { width: 320, height: 320 } },
          async (decodedText) => {
            await handleScan(decodedText.trim());
          },
          () => {}
        );
        isRunningRef.current = true;

        // Ajustar el estilo del video
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
      setMessage("No se pudo acceder a la cámara o está bloqueada.");
    }
  };

  // ✅ Registrar escaneo
  const handleScan = async (token) => {
    if (!token || status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      // 1️⃣ Intentar con QR del padre (usando RPC)
      const { data: parentResult, error: parentError } = await supabase.rpc("scan_guardian_qr", {
        p_token: token,
        p_direction: direction, // Usar la dirección seleccionada por el usuario
        p_scanned_by: user?.id_user,
        p_location: "Entrada principal",
      });

      if (!error && result) {
        setLastScan(result);
        setStatus("success");
        setMessage(
          `${result.guardian_name || "Tutor"} registró la ${
            result.direction === "in" ? "entrada" : "salida"
          } de ${result.child_name || "el niño/a"} correctamente.`
        );
        if (navigator.vibrate) navigator.vibrate(200);
        resetAfterDelay();
        return;
      }

      // 2️⃣ Si no es QR del padre, intentar con QR temporal (autorizado)
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

      if (!tempAuth) throw new Error("QR no encontrado.");

      const ahora = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Guatemala" })
      );
      const inicio = new Date(tempAuth.valid_from);
      const fin = new Date(tempAuth.valid_to);

      if (ahora < inicio)
        throw new Error("⏳ QR aún no activo.");
      if (ahora > fin)
        throw new Error("⛔ QR expirado.");

      // 3️⃣ Registrar manualmente en guardian_scan_log para el tercero
      const { error: insertError } = await supabase.from("guardian_scan_log").insert([
        {
          token: tempAuth.qr_token,
          guardian_id: tempAuth.authorized.id_person,
          child_id: tempAuth.child.id_person,
          direction: direction, // Usar la dirección seleccionada por el usuario
          location: "Retiro autorizado",
          notes: "QR temporal de autorizado",
        },
      ]);

      if (insertError) throw insertError;

      setStatus("success");
      setMessage(
        `✅ ${tempAuth.authorized.first_name} registró la ${
          direction === "in" ? "entrada" : "salida"
        } de ${tempAuth.child.first_name}.`
      );
      if (navigator.vibrate) navigator.vibrate(200);
      resetAfterDelay();
    } catch (err) {
      console.error("Error:", err.message);
      setStatus("error");
      setMessage(err.message || "QR inválido o error al registrar.");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  const resetAfterDelay = () => {
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
      setLastScan(null);
    }, 4000);
  };

  // ✅ Obtener cámaras disponibles
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) {
          const defaultCam = devices[0].id;
          setCameraId(defaultCam);
          startScanner(defaultCam);
        }
      })
      .catch((err) => {
        console.error("No se pudieron obtener cámaras:", err);
        setMessage("No se detectaron cámaras disponibles.");
      });

    return () => {
      if (isRunningRef.current && scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            isRunningRef.current = false;
          })
          .catch(() => {});
      }
    };
  }, []);

  // 🔁 Cambiar cámara
  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === cameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex].id;

    if (isRunningRef.current && scannerRef.current) {
      await scannerRef.current.stop();
      isRunningRef.current = false;
      document.getElementById(qrRegionId).innerHTML = "";
    }
    setCameraId(nextCam);
    startScanner(nextCam);
  };

  // ↔️ Alternar dirección
  const toggleDirection = () => {
    setDirection((prev) => (prev === "in" ? "out" : "in"));
  };

  // 📱 Ajustar tamaño del escáner
  useEffect(() => {
    const handleResize = () => {
      const el = document.getElementById(qrRegionId);
      if (!el) return;

      if (window.innerWidth < 768) {
        el.style.width = "90vw";
        el.style.height = "70vw";
      } else if (window.innerWidth < 1200) {
        el.style.width = "60vw";
        el.style.height = "45vw";
      } else {
        el.style.width = "400px";
        el.style.height = "400px";
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F5EB] text-[#17637A] p-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
        Escáner de Código QR
      </h1>

      {/* 📸 Contenedor del escáner */}
      <div className="relative flex flex-col items-center w-full">
        <div
          id={qrRegionId}
          className="border-4 border-[#17637A] rounded-2xl shadow-lg bg-black overflow-hidden flex items-center justify-center mx-auto transition-all duration-300"
          style={{ maxWidth: "500px", borderRadius: "1rem" }}
        ></div>

        {/* 🎛️ Botones debajo */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            onClick={switchCamera}
            disabled={cameras.length < 2}
            className="flex items-center gap-2 bg-[#17637A] hover:bg-[#145468] text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm md:text-base"
          >
            <Camera size={18} />
            Cambiar cámara
          </button>

          <button
            onClick={toggleDirection}
            className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition text-sm md:text-base ${
              direction === "in"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {direction === "in" ? <LogIn size={18} /> : <LogOut size={18} />}
            {direction === "in" ? "Entrada" : "Salida"}
          </button>
        </div>
      </div>

      {/* 🔄 Estado de carga / éxito / error */}
      {status === "loading" && (
        <div className="flex flex-col items-center mt-6 text-[#17637A]">
          <Loader2 className="animate-spin w-10 h-10 mb-2" />
          <p>Procesando escaneo...</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center mt-6 text-green-600 animate-pulse text-center px-4">
          <CheckCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center mt-6 text-red-600 animate-pulse text-center px-4">
          <XCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold">{message}</p>
        </div>
      )}
    </div>
  );
}
