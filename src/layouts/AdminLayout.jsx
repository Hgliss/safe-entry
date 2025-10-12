import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
    ShieldCheck,
    Users,
    UserStar,
    Building2,
    UserRoundCheck,
    History,
    BarChart3,
    QrCode,
    Menu,
    X,
    LogOut,
} from "lucide-react";

export default function AdminLayout(){
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const handleNavClick = () => setIsOpen(false);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (e) {
            console.error("Error al cerrar sesión:", e);
        } finally {
            try {
                sessionStorage.clear();
            } catch {}
            window.location.replace("/login");
        }
    };
    
    const isActive = (path) => location.pathname.startsWith(path);
    


    
    return(
        <div className="h-screen w-screen flex flex-col md:flex-row font-sans bg-gray-50">
            {/* Navbar */}
            <header className="md:hidden flex items-center justify-between bg-blue-900 text-white p-4 shadow">
                <h1 className="text-x1 font-bold mb-10 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> SafeEntry Admin
                </h1>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="focus:outline-none transition-transform duration-200"
                >
                    {isOpen ? <X size={26} /> : <Menu size={26} />}
                </button>
            </header>
            {/* Sidebar */}
            <aside
                className={`fixed md:static z-40 top-0 left-0 h-full bg-blue-900 text-white w-64 flex flex-col p-6 transform transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
            >
                <div className="flex flex-col gap-3 mb-10">
                <h1 className="text-xl font-bold mb-10 hidden md:flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> SafeEntry Admin
                </h1>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition p-2 rounded-md text-sm font-medium"
                >
                    <LogOut size={18}/>
                    <span>Cerrar sesión</span>
                </button>
                </div>


                
                <nav className="flex flex-col gap-2">
                    <NavItem to="dashboard" icon={<ShieldCheck size={22} />} label="Inicio" onClick={handleNavClick} active={location.pathname === "dashboard"} />
                    <NavItem to="usuarios" icon={<Users size={22} />} label="Usuarios" onClick={handleNavClick} active={location.pathname === "usuarios"} />
                    <NavItem to="padres" icon={<UserStar size={22} />} label="Padres" onClick={handleNavClick} active={location.pathname === "padres"} />
                    <NavItem to="personal" icon={<Building2 size={22} />} label="Personal" onClick={handleNavClick} active={location.pathname === "personal"} />
                    <NavItem to="ninos" icon={<UserRoundCheck size={22} />} label="Niños" onClick={handleNavClick} active={location.pathname === "ninos"} />
                    <NavItem to="/admin/historial" icon={<History size={22} />} label="Historial" onClick={handleNavClick} active={location.pathname === "/admin/historial"} />
                    <NavItem to="/admin/reporteria" icon={<BarChart3 size={22} />} label="Reportería" onClick={handleNavClick} active={location.pathname === "/admin/reporteria"} />
                    <NavItem to="/admin/scanner" icon={<QrCode size={22} />} label="Escáner QR" onClick={handleNavClick} active={location.pathname === "/admin/scanner"} />
                    <NavItem to="/admin/parentqrlis" icon={<QrCode size={22} />} label="QR Padres" onClick={handleNavClick} active={location.pathname === "/admin/parentqrlis"} />
                </nav>
            </aside>

            {/* Área dinámica */ }
            <main
                className="flex-1 p-6 md:p-8 overflow-y-auto md:ml-0 transition-all"
                onClick={() => setIsOpen(false)} // cerrar mmainsi se toca el contenido
            >
                <Outlet />
            </main>

            {/* Fondo oscuro cuando el menú está abierto en móvil */}
            {isOpen && (
            <div
                className="fixed inset-0 backdrop-blur-sm bg-white/10 z-30 md:hidden"
                onClick={() => setIsOpen(false)}
            ></div>

        )}
    </div>
    );


}

function NavItem({ to, icon, label, onClick, active }) {
    return (
    <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition text-sm ${
        active ? "bg-white/20" : "hover:bg-white/10"
        }`}
    >
    {icon}
    <span>{label}</span>
    </Link>
    );
}