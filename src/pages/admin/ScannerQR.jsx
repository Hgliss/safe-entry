import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../api/supabaseClient";

export default function ScannerQR() {
  const [message, setMessage] = useState("Apunta la cámara al código QR");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
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
            {
              fps: 10,
              qrbox: 250,
            },
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

  // 🧠 Lógica al detectar un código QR
  const onScanSuccess = async (decodedText) => {
    // Detener escáner mientras se valida
    if (scannerRef.current) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }

    setMessage("Validando código...");
    const token = decodedText.trim();

    // Llamar validación en Supabase
    await validarQR(token);
  };

  // (opcional) Manejo de errores o falsos positivos
  const onScanFailure = (error) => {
    // Puedes ignorar los intentos fallidos
  };

  // 🔎 Validar QR en Supabase
  const validarQR = async (token) => {
    try {
      const { data, error } = await supabase
        .from("child_authorization")
        .select(
          `
          id_authorization,
          qr_token,
          valid_from,
          valid_to,
          status,
          child:child_id (
            first_name,
            first_last_name
          ),
          authorized:authorized_person_id (
            first_name,
            first_last_name
          )
        `
        )
        .eq("qr_token", token)
        .single();

      if (error || !data) {
        setMessage("❌ QR no válido o no registrado.");
        setScanResult({
          estado: "inválido",
          color: "red",
        });
        return;
      }

      const ahora = new Date();
      const inicio = new Date(data.valid_from);
      const fin = new Date(data.valid_to);

      // Validaciones de tiempo
      if (ahora < inicio) {
        setMessage("⏳ Este QR aún no está activo.");
        setScanResult({
          estado: "pendiente",
          color: "orange",
          info: data,
        });
        return;
      }

      if (ahora > fin) {
        // Actualizar estado a expirado
        await supabase
          .from("child_authorization")
          .update({ status: "expirado" })
          .eq("id_authorization", data.id_authorization);

        setMessage("⛔ Este QR ha expirado.");
        setScanResult({
          estado: "expirado",
          color: "gray",
          info: data,
        });
        return;
      }

      // ✅ Si todo está bien, QR válido
      setMessage("✅ Código QR válido");
      setScanResult({
        estado: "válido",
        color: "green",
        info: data,
      });

      // (Opcional) registrar evento de entrada/salida en tu tabla de logs
      // await supabase.from("log_entries").insert([{ ... }]);
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Error al validar el código.");
      setScanResult({
        estado: "error",
        color: "red",
      });
    }
  };

  // 🔁 Reiniciar escáner
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
                ? "✅ QR válido"
                : scanResult.estado === "expirado"
                ? "⛔ QR expirado"
                : scanResult.estado === "pendiente"
                ? "⏳ QR aún no activo"
                : "❌ QR inválido"}
            </h2>

            {scanResult.info && (
              <div className="text-sm mt-2 text-gray-700">
                <p>
                  <strong>Niño:</strong>{" "}
                  {scanResult.info.child.first_name}{" "}
                  {scanResult.info.child.first_last_name}
                </p>
                <p>
                  <strong>Autorizado:</strong>{" "}
                  {scanResult.info.authorized.first_name}{" "}
                  {scanResult.info.authorized.first_last_name}
                </p>
                <p>
                  <strong>Válido hasta:</strong>{" "}
                  {new Date(scanResult.info.valid_to).toLocaleString("es-GT")}
                </p>
              </div>
            )}
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
