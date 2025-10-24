import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../api/supabaseClient";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      role: null,
      loading: false,
      hydrated: false,
      error: null,

      // Maneja la sesión y el rol
      _handleSession: async (session) => {
        const user = session?.user ?? null;
        set({ user, session });

        if (user) {
          await get().fetchRole(true); // 👈 Forzamos la actualización del rol
        } else {
          set({ role: null, error: null });
        }
      },

      // Setea usuario y sesión
      setFromSession: (user, session) => set({ user, session }),

      // Login
      login: async (email, password) => {
        set({ loading: true, error: null });
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          console.error("Error en el login:", error.message);
          set({ loading: false, error: "Credenciales incorrectas" });
          return;
        }
        set({ loading: false });
      },

      // Inicializa sesión al cargar app
      initializeAuth: async () => {
        set({ loading: true, error: null });
        const { data: { session } } = await supabase.auth.getSession();
        await get()._handleSession(session);
        set({ loading: false });
      },

      // Obtiene rol vía RPC
      fetchRole: async (force = false) => {
        if (get().role && !force) return; // 👈 Solo se salta si no se fuerza
        const { data, error } = await supabase.rpc("get_user_role");
        if (error) {
          console.error("Error al obtener el rol:", error.message);
          set({ role: null, error: "No se pudo obtener el rol" });
        } else {
          set({ role: data ?? null });
        }
      },

      // Logout
      logoutUser: async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  } finally {
    set({
      user: null,
      session: null,
      role: null,
      error: null,
      loading: false,
    });

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Error limpiando almacenamiento:", e);
    }

    window.location.replace("/login");
  }
},
    }),
    {
      name: "safeentry-auth",
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        role: state.role,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    }
  )
);


// Escucha cambios de sesión
supabase.auth.onAuthStateChange(async (_event, session) => {
  const state = useAuthStore.getState();
  if (state.session?.access_token !== session?.access_token) {
    await state._handleSession(session);
  }
});

// Ejecuta initializeAuth tras hidratar
useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.getState().initializeAuth();
});
