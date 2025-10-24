import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../api/supabaseClient";

export default function ScannerQR() {
  const [message, setMessage] = useState("Selecciona un modo para comenzar");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [direction, setDirection] = useState("in");

  const scannerRef = useRef(null);
  const qrReaderRef = useRef(null);

  // 🧩 Inicializar escáner
  useEffect(() => {
    const startScanner = async () => {
      if (!qrReaderRef.current) return;

      try {
        const html5QrCode = new Html5Qrcode(qrReaderRef.current.id);
        scannerRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          setIsScanning(true);
          setMessage(`Escaneando ${direction === "in" ? "entrada" : "salida"}...`);
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            onScanSuccess,
            onScanFailure
          );
        } else {
          setMessage("No se detectó cámara disponible.");
        }
      } catch (error) {
        console.error("Error al iniciar el escáner:", error);
        setMessage("⚠️ Error al iniciar el escáner.");
      }
    };

    const timer = setTimeout(() => startScanner(), 200);
    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [direction]);

  // ✅ Lectura exitosa del QR
  const onScanSuccess = async (decodedText) => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }

    const token = decodedText.trim();
    console.log("🔍 Token detectado:", token);
    setMessage("Validando código...");

    await validarQR(token);
  };

  const onScanFailure = () => {};

  // 🧠 Validar QR de padre o tercero autorizado
  const validarQR = async (token) => {
    try {
      // 1️⃣ Buscar QR del padre o tutor
      const { data: qrPadre } = await supabase
        .from("guardian_child_qr")
        .select(`
          id,
          token,
          status,
          guardian:guardian_id (
            id_person,
            first_name,
            first_last_name
          ),
          child:child_id (
            id_person,
            first_name,
            first_last_name
          )
        `)
        .eq("token", token)
        .maybeSingle();

      if (qrPadre && qrPadre.status === "active") {
        await registrarEvento({
          token,
          guardian_id: qrPadre.guardian.id_person,
          child_id: qrPadre.child.id_person,
        });

        setMessage(`✅ ${direction === "in" ? "Entrada" : "Salida"} del padre registrada`);
        setScanResult({
          estado: "válido",
          color: "green",
          tipo: "padre",
          info: qrPadre,
        });
        return;
      }

      // 2️⃣ Buscar QR del tercero autorizado
      const { data: qrTercero } = await supabase
        .from("child_authorization")
        .select(`
          id_authorization,
          qr_token,
          valid_from,
          valid_to,
          status,
          authorized:authorized_person_id (
            id_person,
            first_name,
            first_last_name
          ),
          child:child_id (
            id_person,
            first_name,
            first_last_name
          )
        `)
        .eq("qr_token", token)
        .maybeSingle();

      if (qrTercero && qrTercero.status === "active") {
        const ahora = new Date();
        const inicio = new Date(qrTercero.valid_from);
        const fin = new Date(qrTercero.valid_to);

        if (ahora < inicio) {
          setMessage("⏳ Este QR aún no está activo.");
          setScanResult({ estado: "pendiente", color: "orange", tipo: "tercero" });
          return;
        }

        if (ahora > fin) {
          await supabase
            .from("child_authorization")
            .update({ status: "expired" })
            .eq("id_authorization", qrTercero.id_authorization);

          setMessage("⛔ Este QR ha expirado.");
          setScanResult({ estado: "expirado", color: "gray", tipo: "tercero" });
          return;
        }

        await registrarEvento({
          token,
          guardian_id: qrTercero.authorized.id_person,
          child_id: qrTercero.child.id_person,
        });

        setMessage(`✅ ${direction === "in" ? "Entrada" : "Salida"} del tercero registrada`);
        setScanResult({
          estado: "válido",
          color: "green",
          tipo: "tercero",
          info: qrTercero,
        });
        return;
      }

      // 3️⃣ Si no se encontró el QR en ninguna tabla
      setMessage("❌ QR no reconocido.");
      setScanResult({ estado: "inválido", color: "red" });
    } catch (err) {
      console.error("⚠️ Error al validar el código:", err);
      setMessage("⚠️ Error al validar el código.");
      setScanResult({ estado: "error", color: "red" });
    }
  };

  // 🪶 Registrar evento en guardian_scan_log
  const registrarEvento = async ({ token, guardian_id, child_id }) => {
    // Asignar la ubicación según el modo
    const location = direction === "in" ? "Entrada principal" : "Salida principal";

    const entry = {
      token,
      guardian_id,
      child_id,
      direction,
      location,
      scanned_at: new Date().toISOString(),
      status: "active",
    };

    const { error } = await supabase.from("guardian_scan_log").insert([entry]);
    if (error) console.error("Error registrando evento:", error);
  };

  // 🔁 Alternar modo Entrada / Salida
  const toggleDirection = () => {
    setDirection((prev) => (prev === "in" ? "out" : "in"));
    setMessage("Cambiando modo...");
    setScanResult(null);
  };

  // ♻️ Reanudar escaneo manualmente
  const reiniciarEscaneo = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          onScanSuccess,
          onScanFailure
        );
        setIsScanning(true);
        setMessage(`Escaneando ${direction === "in" ? "entrada" : "salida"}...`);
        setScanResult(null);
      } catch (error) {
        console.error("Error al reanudar el escaneo:", error);
        setMessage("No se pudo reiniciar el escáner.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-[#17637A] mb-4">
          Escáner de códigos QR
        </h1>

        <button
          onClick={toggleDirection}
          className={`mb-4 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
            direction === "in"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {direction === "in" ? "🔼 Modo: Entrada" : "🔽 Modo: Salida"}
        </button>

        <div
          id="qr-reader"
          ref={qrReaderRef}
          className="border-2 border-[#17637A] rounded-lg mb-4 w-full"
          style={{ width: "100%", height: "280px" }}
        ></div>

        <p className="text-gray-700 mb-3">{message}</p>

        {scanResult && (
          <div
            className={`p-4 rounded-xl border-2 mt-4 ${
              scanResult.color === "green"
                ? "border-green-500 bg-green-100"
                : scanResult.color === "red"
                ? "border-red-500 bg-red-100"
                : scanResult.color === "gray"
                ? "border-gray-500 bg-gray-100"
                : "border-yellow-500 bg-yellow-100"
            }`}
          >
            <h2 className="text-lg font-semibold">
              {scanResult.estado === "válido"
                ? `✅ ${scanResult.tipo === "padre" ? "QR Padre" : "QR Tercero"} válido`
                : scanResult.estado === "expirado"
                ? "⛔ QR expirado"
                : scanResult.estado === "pendiente"
                ? "⏳ QR aún no activo"
                : "❌ QR inválido"}
            </h2>
          </div>
        )}

        {!isScanning && (
          <button
            onClick={reiniciarEscaneo}
            className="mt-6 bg-[#17637A] text-white px-4 py-2 rounded-lg hover:bg-[#145665]"
          >
            🔄 Reanudar escaneo
          </button>
        )}
      </div>
    </div>
  );
}
