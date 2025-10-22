import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../api/supabaseClient";

export default function ScannerQR() {
  const [message, setMessage] = useState("Apunta la cámara al código QR");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);

  // 🧩 Inicializar escáner
  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          setIsScanning(true);
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            onScanSuccess,
            onScanFailure
          );
        } else {
          setMessage("No se detectó cámara disponible.");
        }
      } catch (error) {
        console.error(error);
        setMessage("Error al iniciar el escáner.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // 📸 Cuando se detecta un código QR
  const onScanSuccess = async (decodedText) => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }

    const token = decodedText.trim();
    setMessage("🔍 Validando código...");
    await validarQR(token);
  };

  const onScanFailure = () => {};

  // 🔎 Función principal para validar el token del QR (sin registrar aún)
  const validarQR = async (token) => {
    try {
      const ahora = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Guatemala" })
      );

      // 1️⃣ Buscar en child_authorization (terceros)
      const { data: tempAuth } = await supabase
        .from("child_authorization")
        .select(
          `
          id_authorization,
          qr_token,
          valid_from,
          valid_to,
          status,
          child:child_id(id_person, first_name, first_last_name),
          authorized:authorized_person_id(id_person, first_name, first_last_name)
        `
        )
        .eq("qr_token", token)
        .maybeSingle();

      if (tempAuth) {
        const inicio = new Date(tempAuth.valid_from);
        const fin = new Date(tempAuth.valid_to);

        if (ahora < inicio) {
          return setScanResult({
            estado: "pendiente",
            color: "orange",
            mensaje: "⏳ Este QR aún no está activo.",
            info: tempAuth,
          });
        }

        if (ahora > fin) {
          await supabase
            .from("child_authorization")
            .update({ status: "expirado" })
            .eq("id_authorization", tempAuth.id_authorization);
          return setScanResult({
            estado: "expirado",
            color: "gray",
            mensaje: "⛔ Este QR ha expirado.",
            info: tempAuth,
          });
        }

        await registrarEnHistorial({
          token: tempAuth.qr_token,
          guardian_id: tempAuth.authorized.id_person,
          child_id: tempAuth.child.id_person,
          tipo: "tercero",
        });

        return setScanResult({
          estado: "válido",
          color: "green",
          mensaje: "✅ QR temporal válido — evento registrado.",
          info: tempAuth,
        });
      }

      // 2️⃣ Buscar en guardian_child_qr (padres)
      const { data: padreQR } = await supabase
        .from("guardian_child_qr")
        .select(
          `
          id,
          token,
          guardian:guardian_id(id_person, first_name, first_last_name),
          child:child_id(id_person, first_name, first_last_name)
        `
        )
        .eq("token", token)
        .maybeSingle();

      if (padreQR) {
        await registrarEnHistorial({
          token: padreQR.token,
          guardian_id: padreQR.guardian.id_person,
          child_id: padreQR.child.id_person,
          tipo: "padre",
        });

        return setScanResult({
          estado: "válido",
          color: "blue",
          mensaje: "👨‍👧 QR de padre válido — evento registrado.",
          info: padreQR,
        });
      }

      setScanResult({
        estado: "inválido",
        color: "red",
        mensaje: "❌ QR no válido o no registrado.",
      });
    } catch (err) {
      console.error(err);
      setScanResult({
        estado: "error",
        color: "red",
        mensaje: "⚠️ Error al validar el código.",
      });
    }
  };

  // 🧾 Registrar en guardian_scan_log
  const registrarEnHistorial = async ({ token, guardian_id, child_id, tipo }) => {
    try {
      // Buscar último evento del mismo niño
      const { data: ultimo } = await supabase
        .from("guardian_scan_log")
        .select("direction")
        .eq("child_id", child_id)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      let direction = "in";
      if (ultimo && ultimo.direction === "in") direction = "out";

      await supabase.from("guardian_scan_log").insert([
        {
          token,
          guardian_id,
          child_id,
          direction,
          location: tipo === "padre" ? "entrada principal" : "retiro autorizado",
          notes: tipo === "padre" ? "Acceso del tutor" : "Autorizado temporal",
        },
      ]);
    } catch (err) {
      console.error("Error registrando historial:", err);
    }
  };

  // 🔁 Reanudar escaneo
  const reiniciarEscaneo = async () => {
    if (scannerRef.current) {
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        onScanFailure
      );
      setIsScanning(true);
      setMessage("Apunta la cámara al código QR");
      setScanResult(null);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-[#17637A] mb-4">
          Escáner de códigos QR
        </h1>

        <div
          id="qr-reader"
          className="border-2 border-[#17637A] rounded-lg mb-4 w-full"
          style={{ width: "100%", height: "280px" }}
        ></div>

        {scanResult ? (
          <div
            className={`p-4 rounded-xl border-2 mt-4 ${
              scanResult.color === "green"
                ? "border-green-500 bg-green-100"
                : scanResult.color === "red"
                ? "border-red-500 bg-red-100"
                : scanResult.color === "gray"
                ? "border-gray-500 bg-gray-100"
                : scanResult.color === "blue"
                ? "border-blue-500 bg-blue-100"
                : "border-yellow-500 bg-yellow-100"
            }`}
          >
            <h2 className="text-lg font-semibold mb-2">
              {scanResult.mensaje}
            </h2>

            {scanResult.info && (
              <div className="text-sm text-gray-700">
                {scanResult.info.child && (
                  <p><strong>Tutor:</strong> {scanResult.info.guardian.first_name} {scanResult.info.guardian.first_last_name}</p>
                )}
                {scanResult.info.child && (
                  <p>
                    <strong>Niño:</strong>{" "}
                    {scanResult.info.child.first_name}{" "}
                    {scanResult.info.child.first_last_name}
                  </p>
                )}
                {scanResult.info.authorized && (
                  <p>
                    <strong>Autorizado:</strong>{" "}
                    {scanResult.info.authorized.first_name}{" "}
                    {scanResult.info.authorized.first_last_name}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-700 mb-3 h-10">{message}</p>
        )}

        {/* Botones de acción después de escanear */}
        {scanResult && scanResult.estado === "válido" && (
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={() => handleRegister("in")}
              disabled={isProcessing}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
            >
              {isProcessing ? "Registrando..." : "Registrar Entrada"}
            </button>
            <button
              onClick={() => handleRegister("out")}
              disabled={isProcessing}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400"
            >
              {isProcessing ? "Registrando..." : "Registrar Salida"}
            </button>
          </div>
        )}

        {/* Botón para reanudar o escanear de nuevo */}
        {(!isScanning && !isProcessing && scanResult?.estado !== 'válido') && (
          <button
            onClick={reiniciarEscaneo}
            className="mt-6 bg-[#17637A] text-white px-6 py-2 rounded-lg hover:bg-[#145665] transition"
          >
            🔄 Reanudar escaneo
          </button>
        )}

      </div>
    </div>
  );
}
