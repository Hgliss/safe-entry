import React, { useState } from "react";
import { Link, Outlet, useLocation} from "react-router-dom";
import {
    QrCode,
    History,
    Bell,
    UserPlus,
    Menu,
    X,
    LogOut,
    ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export default function PadresLayout(){
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const logoutUser = useAuthStore((state) => state.logoutUser);
    
    const handleLogout = async () => {
        logoutUser();
    };

    const handleNavClick = () => setIsOpen(false);



     return(
        <div className="h-screen w-screen flex flex-col md:flex-row font-sans bg-gray-50">
            {/* Navbar */}
            <header className="md:hidden flex items-center justify-between bg-blue-900 text-white p-4 shadow">
                <h1 className="text-x1 font-bold mb-10 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> SafeEntry Padre
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
                    <ShieldCheck className="h-5 w-5" /> SafeEntry Padres
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
                    <NavItem to="home" icon={<ShieldCheck size={22} />} label="Inicio" onClick={handleNavClick} active={location.pathname === "home"} />
                    <NavItem to="qrpage" icon={<QrCode size={22} />} label="Codigo Qr" onClick={handleNavClick} active={location.pathname === "qrpage"} />
                    <NavItem to="historial" icon={<History size={22} />} label="Historial" onClick={handleNavClick} active={location.pathname === "historial"} />
                    <NavItem to="autorizacion" icon={<UserPlus size={22} />} label="Autorizaciones" onClick={handleNavClick} active={location.pathname === "autorizacion"} />
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
