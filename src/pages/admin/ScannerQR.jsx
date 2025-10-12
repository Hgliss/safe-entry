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
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [direction, setDirection] = useState("in"); // in | out
  const [cameraId, setCameraId] = useState(null);
  const [cameras, setCameras] = useState([]);
  const user = useAuthStore((state) => state.user);
  const qrRegionId = "qr-reader";
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);

  // ✅ Registrar escaneo
  const handleScan = async (data) => {
    if (!data || status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      const { data: result, error } = await supabase.rpc("scan_guardian_qr", {
        p_token: data,
        p_direction: direction,
        p_scanned_by: user?.id_user,
        p_location: "Entrada principal",
      });

      if (error) throw error;

      setLastScan(result);
      setStatus("success");
      setMessage(
        `${result.guardian_name || "Tutor"} registró la ${
          result.direction === "in" ? "entrada" : "salida"
        } de ${result.child_name || "el niño/a"} correctamente.`
      );

      if (navigator.vibrate) navigator.vibrate(200);

      setTimeout(() => {
        setStatus("idle");
        setMessage("");
        setLastScan(null);
      }, 4000);
    } catch (e) {
      console.error(e);
      setStatus("error");
      setMessage("QR inválido o error al registrar el escaneo.");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  // ✅ Iniciar escáner con permisos reforzados
  const startScanner = async (deviceId) => {
    const scanner = new Html5Qrcode(qrRegionId);
    scannerRef.current = scanner;

    const constraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    try {
      if (!isRunningRef.current) {
        await scanner.start(
          deviceId ? { deviceId } : constraints,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await handleScan(decodedText);
          },
          () => {}
        );
        isRunningRef.current = true;
      }
    } catch (err) {
      console.error("Error al iniciar cámara:", err);
      setStatus("error");
      setMessage(
        "No se pudo acceder a la cámara o el navegador la tiene bloqueada."
      );
    }
  };

  // ✅ Listar cámaras al montar componente
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

  // ✅ Cambiar cámara
  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === cameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex].id;

    if (isRunningRef.current && scannerRef.current) {
      await scannerRef.current.stop();
      isRunningRef.current = false;
      document.getElementById(qrRegionId).innerHTML = ""; // limpiar DOM
    }
    setCameraId(nextCam);
    startScanner(nextCam);
  };

  // ✅ Alternar dirección Entrada / Salida
  const toggleDirection = () => {
    setDirection((prev) => (prev === "in" ? "out" : "in"));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F5EB] text-[#17637A] p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Código QR</h1>

      {/* Contenedor del escáner */}
      <div className="relative flex flex-col items-center">
        <div
          id={qrRegionId}
          className="w-72 h-72 border-4 border-[#17637A] rounded-2xl shadow-lg bg-white"
        ></div>

        {/* Botones fijos debajo */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={switchCamera}
            disabled={cameras.length < 2}
            className="flex items-center gap-2 bg-[#17637A] hover:bg-[#145468] text-white font-semibold px-4 py-2 rounded-xl transition"
          >
            <Camera size={18} />
            Cámara
          </button>

          <button
            onClick={toggleDirection}
            className={`flex items-center gap-2 font-semibold px-4 py-2 rounded-xl transition ${
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

      {/* Estado: cargando */}
      {status === "loading" && (
        <div className="flex flex-col items-center mt-6 text-[#17637A]">
          <Loader2 className="animate-spin w-10 h-10 mb-2" />
          <p>Procesando escaneo...</p>
        </div>
      )}

      {/* Estado: éxito */}
      {status === "success" && (
        <div className="flex flex-col items-center mt-6 text-green-600 animate-pulse">
          <CheckCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold text-center">{message}</p>
        </div>
      )}

      {/* Estado: error */}
      {status === "error" && (
        <div className="flex flex-col items-center mt-6 text-red-600 animate-pulse">
          <XCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold text-center">{message}</p>
        </div>
      )}

      {/* Info de la última lectura */}
      {lastScan && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 w-72 text-sm text-gray-700">
          <p>
            <span className="font-semibold">Hora:</span>{" "}
            {new Date(lastScan.scanned_at).toLocaleTimeString()}
          </p>
          <p>
            <span className="font-semibold">Versión QR:</span>{" "}
            {lastScan.new_version}
          </p>
        </div>
      )}
    </div>
  );
}
