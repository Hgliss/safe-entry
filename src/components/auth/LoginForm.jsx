import React, { useState} from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const LoginForm = ({ onShowResetModal }) => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        if (!email || !password){
            setMessage("Por favor, completa todos los campos.");
            return;
        }

        setLoading(true);
        await login(email, password);
        setLoading(false);

        const error = useAuthStore.getState().error;
        if (error){
            setMessage("Error al iniciar sesión, intentalo de nuevo.");
            return;
        }

        setMessage("Sesión iniciada con éxito.");
        navigate("/role-redirect");
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-sm text-cyan-800">Correo electrónico</label>
                <input 
                    type="email"
                    placeholder="Ingresa tu correo electrónico"
                    className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-teal-800 bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} 
                />
            </div>
            <div>
                <label className="text-sm text-cyan-800">Contraseña</label>
                <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-teal-800 bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                >
                    {showPassword ? <EyeOff size={20} /> : <Eye size ={20} />}
                </button>
            </div>
            </div>
                
                <button
                    type="submit"
                    className="w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-950 font-semibold transition disabled:opacity-60"
                    disabled={loading}
                >
                    {loading ? "Ingresando..." : "Ingresar"}
                </button>
                {message && (
                    <p className="text-sm text-center mt-2 text-red-500">{message}</p>
                )}
                <button
                    type="button"
                    onClick={onShowResetModal}
                    className="text-sm text-center text-blue-700 hover:underline"
                >
                    ¿Olvidaste tu contraseña?
                </button>
        </form>
        
    );
};

export default LoginForm;
