import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/public/LoginPage";
import RoleRedirect from "./pages/public/RoleRedirect";


import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Usuarios from "./pages/admin/Usuarios";
import Padres from "./pages/admin/Padres"


function App() {
  return (
    <Router>
      <Routes>
        {/* Pagina de Login */}
        <Route path="/login" element={ <LoginPage /> } />
        <Route path="/" element={ <Navigate to = "/login"/> } />

        {/* Redirecciones de Roles */}
        <Route path="/role-redirect" element={ <RoleRedirect /> } />
        
        
        
        {/* Admin con Layout fijo*/}
        <Route path="/admin" element={ <AdminLayout /> }>
            {/* Rutas hijas de Admin */}
            <Route index element={<Navigate to="dashboard"/>}/>
            <Route path="dashboard" element={ <Dashboard /> } />
            <Route path="usuarios" element={ <Usuarios /> } />
            <Route path="padres" element={ <Padres /> } />

        </Route>
      </Routes>
    </Router>
  );
}

export default App
