import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../api/supabaseClient";

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            session: null,
            role: null,
            loading: true,
            error: null,
            
            // Función interna para manejar la sesión y el rol del usuario
            _handleSession: async (session) => {
                const user = session?.user ?? null;
                set({ user, session });
                
                if (user) {
                    await get().fetchRole();
                } else {
                    set({ role: null, error: null });
                }
            },
            
            //Setea el usuario y la sesion
            setFromSession: (user, session) => set({ user, session }),

            login: async (email, password) => {
                set({ loading: true, error: null });
                const { data, error} = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error){
                    console.error("Error en el login:", error.message);
                    set({ loading: false, error: "Credenciales incorrectas" });
                    return;
                }

                // onAuthStateChange se encargará de actualizar el estado
                set({ loading: false});
            },

            initializeAuth: async () =>{
                set({ loading: true });
                const { data: {session} } = await supabase.auth.getSession();
                // No es necesario llamar a logout() si no hay sesión, 
                // _handleSession(null) limpiará el estado.
                await get()._handleSession(session);
                set({ loading: false });
            },

            //Obtener el rol del usuario por medio de RPC de Supabase
            fetchRole: async () => {
                const currentRole = get().role;
                if (currentRole) return;

                const { data, error } = await supabase.rpc("get_user_role");
                if (error) {
                    console.error("Error al obtener el rol:", error.message);
                    set ({role: null, error: "No se pudo obtener el rol"});
                }else{
                    set({ role: data ?? null});
                }
            },

            //Cerrar sesión
            logout: async () => {
                await supabase.auth.signOut();
                set({
                    user: null,
                    session: null,
                    role: null,
                    error: null,
                    loading: false,
                });
            },
        }),
        {
            name: "safeentry-auth",
            partialize: (state) => ({
                user: state.user,
                session: state.session,
                role: state.role,
            }),
        }

    )
);

//Escucha los cambios de sesión y sincroniza el estado
if (typeof window !== "undefined") {
    supabase.auth.onAuthStateChange(async (_event, session) =>{
        await useAuthStore.getState()._handleSession(session);
    });
}