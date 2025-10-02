import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import {
    Users,
    History,
    LogIn, 
    LogOut
} from "lucide-react";

export default function Dashboard(){
    const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalPersonas: 0,
    entradasHoy: 0,
    salidasHoy: 0,
  });

    useEffect(() => {

        const fetchData = async () => {
            try{
                //Total de usuarios
                const { count: totalUsuarios } = await supabase
                .from("app_user")
                .select("*", { count: "exact", head: true});

                //Total personas activas
                const { count: totalPersonas } = await supabase
                .from("person")
                .select("*", { count: "exact", head: true});

                //Entradas hoy
                const { count: entradasHoy } = await supabase
                .from("guardian_scan_log")
                .select("*", { count: "exact", head: true})
                .eq("direction", "in")
                .gte("scanned_at", new Date().toISOString().split("T")[0]);

                //Salidas hoy
                const { count: salidasHoy } = await supabase
                .from("guardian_scan_log")
                .select("*", { count: "exact", head: true})
                .eq("direction", "out")
                .gte("scanned_at", new Date().toISOString().split("T")[0]);

                setStats({
                    totalUsuarios: totalUsuarios ?? 0,
                    totalPersonas: totalPersonas ?? 0,
                    entradasHoy: entradasHoy ?? 0,
                    salidasHoy: salidasHoy ?? 0,
                });
            }catch(err){
                console.error("Error al obtener estadísticas:", err);
            }
        };
        fetchData();
    },[]);

    return(
        <div>
            <h2 className="text-2x1 font-bold mb-6">Dashboard de Métricas</h2>

            <div className="grid gap-6 sm"grid-cols-2 lg:grid-cols-4>
                <MetricCard
                    icon={<Users className="text-emerald-600" />}
                    label="Usuarios"
                    value={stats.totalUsuarios}
                />
                <MetricCard
                    icon={<Users className="text-blue-600" />}
                    label="Personas activas"
                    value={stats.totalPersonas}
                />
                <MetricCard
                    icon={<LogIn className="text-green-600" />}
                    label="Entradas hoy"
                    value={stats.entradasHoy}
                />
                <MetricCard
                    icon={<LogOut className="text-red-600" />}
                    label="Salidas hoy"
                    value={stats.salidasHoy}
                />
            </div>            
        </div>
    )
}

function MetricCard({ icon, label, value }) {
    return (
    <div className="bg-white shadow rounded-lg p-5 flex items-center gap-4">
        <div className="p-3 rounded-full bg-gray-100">{icon}</div>
        <div>
            <p className="text-gray-500 text-sm">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
            </div>
            </div>
    );
}