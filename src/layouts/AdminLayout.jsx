import { Link, Outlet } from "react-router-dom";
import {
    ShieldCheck,
    Users,
    UserStar,
    Building2,
    UserRoundCheck,
    History,
    BarChart3,
    QrCode,
} from "lucide-react";

export default function AdminLayout(){
    return(
        <div className="h-screen w-screen flex font-sans ">
            {/* Sidebar */}
            <aside className= "w-64 bg-blue-900 text-white flex flex-col p-6">
                <h1 className="text-x1 font-bold mb-10 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> SafeEntry Admin
                </h1>
                <nav className="flex flex-col gap-2">
                    <NavItem to="dashboard" icon={<ShieldCheck size={22} />} label="Inicio" />
                    <NavItem to="usuarios" icon={<Users size={22} />} label="Usuarios" />
                    <NavItem to="admin/padres" icon={<UserStar size={22} />} label="Padres" />
                    <NavItem to="admin/personal" icon={<Building2 size={22} />} label="Personal" />
                    <NavItem to="admin/ninos" icon={<UserRoundCheck size={22} />} label="Niños" />
                    <NavItem to="admin/historial" icon={<History size={22} />} label="Historial" />
                    <NavItem to="admin/reporteria" icon={<BarChart3 size={22} />} label="Reportería" />
                    <NavItem to="admin/scanner" icon={<QrCode size={22} />} label="Escáner Qr" />
                    <NavItem to="admin/parentqrlis" icon={<QrCode size={22} />} label="QR Padres" />
                </nav>
            </aside>

            {/* Área dinámica */ }
            <main className="flex-1 bg-gray-50 p-8 overlow-y-auto">
                <Outlet /> {/* Aquí se renderizan las páginas hijas */}
            </main>
        </div>        
    )








}

function NavItem({ to, icon, label }){
    return(
        <Link 
        to= {to}
        className="flex items-center gap2 px-3 py-2 rounded-md hover:bg-white/20 transition"
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}