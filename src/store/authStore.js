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

            initializeAuth: async () =>{
                const { data: {session} } = await supabase.auth.getSession();
                const user = session?.user ?? null;

                if (user){
                    get().setFromSession(user, session);
                    await get().fechtRole().catch(() => {});
                }else {
                    get().logout().catch(() => {})
                }
                set({ loading: false });
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
                    set({ loading: false, error: "Credenciales incorrectas" });
                    return;
                }

                set({ user: data.user, session: data.session})

                await get().fetchRole();
                set({ loading: false});
            },

            initializeAuth: async () =>{
                const { data: {session} } = await supabase.auth.getSession();
                const user = session?.user ?? null;

                if (user){
                    get().setFromSession(user, session);
                    await get().fechtRole().catch(() => {});
                }else {
                    get().logout().catch(() => {})
                }
                set({ loading: false });
            },

            //Obtener el rol del usuario por medio de RPC de Supabase
            fetchRole: async () => {
                const currentRole = get().role;
                if (currentRole) return;

                const { data, error } = await supabase.rpc("get_user_role");
                if (error) {
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
    supabase.auth.onAuthStateChange((_event, session) =>{
        const user = session?.user ?? null;
        const s = useAuthStore.getState();

        if (user) {
            s.setFromSession(user, session);
            s.fetchRole().catch(() => {});
        } else {
            s.logout().catch(() => {});
        }
    });
}